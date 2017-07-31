const gulp = require('gulp')
const fs = require('fs')
const path = require('path')
const del = require('del')
const gulpData = require('gulp-data')
const foreach = require('gulp-foreach')
const pug = require('gulp-pug')
const sass = require('gulp-sass')
const autoprefixer = require('gulp-autoprefixer')
const browsersync = require('browser-sync').create()
const sasslint = require('gulp-sass-lint')
const cleancss = require('gulp-clean-css')
const rename = require('gulp-rename')
const ghPages = require('gulp-gh-pages')
const environments = require('gulp-environments')
const listDir = require('list-dir')

const production = environments.production
const development = environments.development


/* Helper functions
---------------------------------------------------------------- */

function getJsonFile (file) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function getJsonData (file) {
    return require(file.path)
}

function getRoot () {
    return production() ? '/mealplans/' : '/'
}

/* Supporting tasks
---------------------------------------------------------------- */

gulp.task('clean', (done) => {
    return del('dist', done)
})

gulp.task('html', () => {
    const files = listDir.sync('src/plans')
    const names = []
    for(let i=0; i<files.length; i++) {
        names.push(path.parse(files[i]).name)
    }
    return gulp.src('src/html/index.pug')
        .pipe(pug({
            data: {
                root: getRoot(),
                files: names
            }
        }))
        .pipe(gulp.dest('dist'))
})

gulp.task('plans', function() {
    return gulp.src('src/plans/**/*.json')
        .pipe(foreach(function (stream, file) {
            var jsonFile = file
            var jsonBasename = path.basename(jsonFile.path, path.extname(jsonFile.path))
            return gulp.src('src/html/plan.pug')
                .pipe(gulpData(getJsonData(jsonFile)))
                .pipe(pug({
                    data: {
                        root: getRoot()
                    }
                }))
                .pipe(rename(function(htmlFile) {
                    htmlFile.basename = jsonBasename
                }))
            .pipe(gulp.dest('dist/plans'))
        })
    )
})

gulp.task('css', () => {
    return gulp.src('src/styles/main.sass')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(gulp.dest('dist/styles'))
        .pipe(browsersync.stream())
})

gulp.task('serve', () => {
    browsersync.init({
        server: {
            baseDir: './dist'
        },
        port: 3333,
        notify: false,
        open: false
    })
})

gulp.task('reload', (done) => {
    browsersync.reload()
    done()
})

gulp.task('deploy:ghpages', () => {
    return gulp.src('./dist/**/*')
        .pipe(ghPages());
});

/* Watch tasks
---------------------------------------------------------------- */

gulp.task('watch:html', () => {
    gulp.watch('src/html/index.pug', gulp.series('html', 'reload'))
})

gulp.task('watch:plans', () => {
    gulp.watch(['src/html/plan.pug', 'src/plans/*.json'], gulp.series('plans', 'reload'))
})

gulp.task('watch:styles', () => {
    gulp.watch('src/styles/**/*', gulp.series('css'))
})

gulp.task('watch', gulp.parallel('watch:html', 'watch:styles', 'watch:plans'))


/* Minify/production tasks
---------------------------------------------------------------- */

gulp.task('minify:css', () => {
    return gulp.src('dist/styles/main.css')
        .pipe(cleancss())
        .pipe(gulp.dest('dist/styles'))
})

/* Lint tasks
---------------------------------------------------------------- */

gulp.task('lint:sass', () => {
    const opts = {
        configFile: './sass-lint.yml'
    }
    return gulp.src('src/styles/**/*.s+(a|c)ss')
        .pipe(sasslint(opts))
        .pipe(sasslint.format())
        .pipe(sasslint.failOnError())
})


/* Primary tasks
---------------------------------------------------------------- */

gulp.task('build', gulp.series('clean', gulp.parallel('html', 'plans', 'css')))

gulp.task('default', gulp.series('build', gulp.parallel('serve', 'watch')))

gulp.task('minify', gulp.series('css', 'minify:css'))

gulp.task('deploy', gulp.series('build', 'minify', 'deploy:ghpages'))
