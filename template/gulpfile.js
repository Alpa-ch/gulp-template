// Определяем переменную "preprocessor"
let preprocessor = 'sass'; 

const { src, dest, parallel, series, watch } = require('gulp');

const browserSync   = require('browser-sync').create();
const concat        = require('gulp-concat');
const uglify        = require('gulp-uglify-es').default;
const sass          = require('gulp-sass');
const autoprefixer  = require('gulp-autoprefixer');
const cleancss      = require('gulp-clean-css');
const imagemin      = require('gulp-imagemin');
const newer         = require('gulp-newer');
const del           = require('del');
const pug           = require('gulp-pug');
const htmlValidator = require('gulp-w3c-html-validator');
const bemValidator  = require('gulp-html-bem-validator');

// Определяем логику работы Browsersync
function browsersync() {
	browserSync.init({ // Инициализация Browsersync
		server: { baseDir: 'app/' }, // Указываем папку сервера
		notify: false, // Отключаем уведомления
		online: true // Режим работы: true или false
	})
}

function scripts() {
	return src([ // Берём файлы из источников
		// 'node_modules/jquery/dist/jquery.min.js', // Пример подключения библиотеки
		'app/js/app.js', // Пользовательские скрипты, использующие библиотеку, должны быть подключены в конце
		])
	.pipe(concat('app.min.js')) // Конкатенируем в один файл
	.pipe(uglify()) // Сжимаем JavaScript
	.pipe(dest('app/js/')) // Выгружаем готовый файл в папку назначения
	.pipe(browserSync.stream()) // Триггерим Browsersync для обновления страницы
}

function styles() {
	return src('app/' + preprocessor + '/*.' + preprocessor + '') // Выбираем источник: "app/sass/main.sass" или "app/less/main.less"
	.pipe(eval(preprocessor)()) // Преобразуем значение переменной "preprocessor" в функцию
	//.pipe(concat('app.min.css')) // Конкатенируем в файл app.min.js
	.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true })) // Создадим префиксы с помощью Autoprefixer
	.pipe(cleancss( { level: { 1: { specialComments: 0 } }/* , format: 'beautify' */ } )) // Минифицируем стили
	.pipe(dest('app/css/')) // Выгрузим результат в папку "app/css/"
	.pipe(browserSync.stream()) // Сделаем инъекцию в браузер
}

function images() {
	return src('app/images/src/**/*') // Берём все изображения из папки источника
	.pipe(newer('app/images/dest/')) // Проверяем, было ли изменено (сжато) изображение ранее
	.pipe(imagemin()) // Сжимаем и оптимизируем изображеня
	.pipe(dest('app/images/dest/')) // Выгружаем оптимизированные изображения в папку назначения
}

function cleanimg() {
	return del('app/images/dest/**/*', { force: true }) // Удаляем всё содержимое папки "app/images/dest/"
}

function buildcopy() {
	return src([ // Выбираем нужные файлы
		'app/css/**/*.min.css',
		'app/js/**/*.min.js',
		'app/images/dest/**/*',
		'app/**/*.html',
		], { base: 'app' }) // Параметр "base" сохраняет структуру проекта при копировании
	.pipe(dest('dist')) // Выгружаем в папку с финальной сборкой
}

function cleandist() {
	return del('dist/**/*', { force: true }) // Удаляем всё содержимое папки "dist/"
}

function pugs() {
    return src('app/pages/includes/*.pug')
    .pipe(pug())
    .pipe(htmlValidator())
    .pipe(bemValidator())
    .pipe(dest('app/'))
    .pipe(browserSync.stream()) // Сделаем инъекцию в браузер
}

function startwatch() {
	// Выбираем все файлы JS в проекте, а затем исключим с суффиксом .min.js
    watch(['app/**/*.js', '!app/**/*.min.js'], scripts);
    
    watch(['app/pages/**/*.pug'], pugs);
	
	// Мониторим файлы препроцессора на изменения
	watch('app/**/' + preprocessor + '/**/*', styles);

	// Мониторим файлы HTML на изменения
	watch('app/**/*.html').on('change', browserSync.reload);

	// Мониторим папку-источник изображений и выполняем images(), если есть изменения
	watch('app/images/src/**/*', images);
}

// Экспортируем функцию browsersync() как таск browsersync. Значение после знака = это имеющаяся функция.
exports.browsersync = browsersync;

// Экспортируем функцию scripts() в таск scripts
exports.scripts = scripts;

// Экспортируем функцию styles() в таск styles
exports.styles = styles;

// Экспорт функции images() в таск images
exports.images = images;

// Экспортируем функцию cleanimg() как таск cleanimg
exports.cleanimg = cleanimg;

exports.pugs = pugs;

// Создаём новый таск "build", который последовательно выполняет нужные операции
exports.build = series(cleandist, pugs, styles, scripts, images, buildcopy);

// Экспортируем дефолтный таск с нужным набором функций
exports.default = parallel(pugs, styles, scripts, browsersync, startwatch);