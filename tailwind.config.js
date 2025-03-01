// tailwind.config.js

module.exports = {
  content: [
    './views/**/*.ejs', // Add EJS file path for purging unused styles
    './public/**/*.js', // Include any JS files you might use in your public directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
