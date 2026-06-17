const path = require('path');
//const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        app: './src/index.js'
    },
    devtool: false,
    devServer: {
        static: './dist',
        hot: true,
    },
    plugins: [
        // new HtmlWebpackPlugin({
        //     title: 'Hot Module Replacement',
        // }),
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, './dist'),
        clean: true,
    },
    performance: {
        hints: false,
    },
    module: {
        rules: [
            //..
        ]
    }
};
