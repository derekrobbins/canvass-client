var gulp = require('gulp');
var watch = require('gulp-watch');
var jspm = require('gulp-jspm');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('watch', ['watch:js', 'watch:css']);
gulp.task('watch:js', function() {
    return gulp.src('js/*.js')
        .pipe(watch('js/*.js'))
        .pipe(concat())
        .pipe(gulp.dest('build'));
});
gulp.task('watch:css', function() {

});
gulp.task('build', function() {
    return gulp.src('js/main.js')
        .pipe(sourcemaps.init())
        .pipe(jspm({selfExecutingBundle: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('build'));
});
