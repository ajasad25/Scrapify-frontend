module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['@babel/plugin-transform-private-methods', { loose: true }],
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json'],
        alias: {
          '@assets': './src/assets',
          '@components': './src/components',
          '@screens': './src/screen',
          '@utils': './src/utils'
        }
      }
    ]
  ]
};
