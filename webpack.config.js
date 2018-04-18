/**
 * Created by jane on 18/04/2018.
 */
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),


    },
    module: {
        loaders: [
            {
                test: /\.jsx?/,
                include:  path.resolve(__dirname, 'src'),
                loader: 'babel-loader'
            }
        ]
    },

    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist',
        port: '3009'
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Development',
            template: './src/index.html'

        })
    ],
}


