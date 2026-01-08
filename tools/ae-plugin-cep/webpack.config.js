const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/js/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
      scriptLoading: 'defer',
      minify: false  // Don't minify to preserve script order
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'CSXS', to: 'CSXS' },
        { from: 'src/jsx', to: 'jsx' },
        { from: '.debug', to: '.debug', noErrorOnMissing: true },
        { from: 'src/js/CSInterface.js', to: 'js/CSInterface.js' }
      ]
    })
  ],
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.jsx']
  }
};

