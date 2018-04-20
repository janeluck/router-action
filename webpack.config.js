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
                test: /\.jsx?$/,
                include: path.resolve(__dirname, 'src'),
                loader: 'babel-loader'
            },
            {
                test: /\.less$/,
                include: path.resolve(__dirname, 'src'),
                use: [
                    {loader: 'style-loader'},
                    {loader: 'css-loader'},
                    {loader: 'less-loader'}
                ]
            },
            {
                test: /\.css/,

                use: [
                    {loader: 'style-loader'},
                    {loader: 'css-loader'},

                ]
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
            title: 'REACT-ROUTER',
            template: './src/index.html'

        })
    ],
}


