"use strict";
var gulp = require('gulp'),
	runSequence = require('run-sequence'),
	del = require('del'),
	babel = require('gulp-babel'),
	replace = require('gulp-replace');

gulp.task('build:clean', function() {
	return del([
		'build/**/*'
	]);
});

gulp.task('build:copy', function() {
	return gulp.src(['README.md', 'LICENSE.txt', 'package.json'])
		.pipe(gulp.dest('build'));
});

gulp.task('build:babel', function() {
	return gulp.src('lib/**/*.js')
		.pipe(babel())
		.pipe(gulp.dest('build/lib'));
});

gulp.task('build:bin', function() {
	return gulp.src('bin/mediawiki-extension.js')
		.pipe(replace(/^require\('babel\/register'\)\(\);\n/m, ''))
		// .pipe(babel()) // Not currently needed as mediawiki-extension.js is written in ES5 so it'll run without a build step
		.pipe(gulp.dest('build/bin'));
});

gulp.task('build', function(cb) {
	runSequence('build:clean', ['build:copy', 'build:babel', 'build:bin'], cb);
});

gulp.task('default', ['build']);
