var path = require("path");
var webpack = require('webpack');
var BundleTracker = require('webpack-bundle-tracker');

module.exports = {
  context: __dirname,

  entry: {
      demo: './Volt/static/js/demo',
      login: './Volt/static/js/login',
      nav: './Volt/static/js/nav',
      devices: './Volt/static/js/devices',
      test: './Volt/static/js/test',
  },

  output: {
      path: path.resolve('./Volt/static/bundles/'),
      filename: "[name]-[hash].js",
  },

  plugins: [
    new BundleTracker({filename: './webpack-stats.json'}),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.jsx']
  }

};


// Compile:  ./node_modules/.bin/webpack --config webpack.config.js