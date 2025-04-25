import path from 'path'
import pluginRss from "@11ty/eleventy-plugin-rss" // needed for absoluteUrl SEO feature
import eleventyNavigationPlugin from "@11ty/eleventy-navigation"
import EleventyVitePlugin from "@11ty/eleventy-plugin-vite"
import Image from "@11ty/eleventy-img"
import yaml from "js-yaml" // Because yaml is nicer than json for editors
import * as dotenv from 'dotenv'
// import UpgradeHelper from "@11ty/eleventy-upgrade-help"

dotenv.config()

const baseUrl = process.env.BASE_URL || "http://localhost:8080"
console.log('baseUrl is set to ...', baseUrl)

const globalSiteData = {
  title: "Track Record",
  description: "Songs to listen to before you die",
  locale: 'en',
  baseUrl: baseUrl,
}

export default function (eleventyConfig) {

  /* --- GLOBAL DATA --- */

  eleventyConfig.addGlobalData("site", globalSiteData);

  /* --- YAML SUPPORT --- */

  eleventyConfig.addDataExtension("yaml", contents => yaml.load(contents));
  eleventyConfig.addDataExtension("yml", contents => yaml.load(contents));

  /* --- PASSTHROUGHS --- */

  eleventyConfig.addPassthroughCopy('src/assets/css')
  eleventyConfig.addPassthroughCopy('src/assets/js')
  eleventyConfig.addPassthroughCopy('src/assets/images')

  /* --- PLUGINS --- */

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(EleventyVitePlugin, {
    viteOptions: {
      build: {
        outDir: '_site',
        emptyOutDir: false, // Don't empty the directory to preserve passthrough copies
        assetsDir: 'assets',
        rollupOptions: {
          input: {
            main: './src/assets/js/index.js',
            styles: './src/assets/css/index.css'
          },
          output: {
            // Only process JS and CSS files
            assetFileNames: (assetInfo) => {
              if (assetInfo.name.endsWith('.js')) {
                return 'assets/js/[name]-[hash].js';
              }
              if (assetInfo.name.endsWith('.css')) {
                return 'assets/css/[name]-[hash].css';
              }
              return 'assets/[name]-[hash][extname]';
            },
            // Configure chunk splitting
            manualChunks: {
              'vendor': ['alpinejs', 'theme-change'],
              'main': ['./src/assets/js/index.js']
            },
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js'
          }
        }
      },
      server: {
        port: 8080
      },
      root: './src',
      publicDir: './src/assets',
      base: '/',
      css: {
        devSourcemap: true
      }
    }
  });

  /* --- SHORTCODES --- */

  // Image shortcode config
  let defaultSizesConfig = "(min-width: 1200px) 1400px, 100vw"; // above 1200px use a 1400px image at least, below just use 100vw sized image

  eleventyConfig.addShortcode("image", async function (src, alt, sizes = defaultSizesConfig, classList = "") {
    console.log(`Generating image(s) from:  ${src}`)
    let metadata = await Image(src, {
      widths: [800, 1500],
      formats: ["webp", "jpeg"],
      urlPath: "/images/",
      outputDir: "./_site/images/",
      filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src)
        const name = path.basename(src, extension)
        return `${name}-${width}w.${format}`
      }
    });

    let imageAttributes = {
      alt,
      sizes,
      loading: "lazy",
      decoding: "async",
      class: classList
    };

    return Image.generateHTML(metadata, imageAttributes);
  });

  // Output year for copyright notices
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);


  /* --- FILTERS --- */

  // Date filter
  eleventyConfig.addFilter("date", function(date, format) {
    return new Date(date).toLocaleDateString('en-US', {
      year: format.includes('YYYY') ? 'numeric' : undefined,
      month: format.includes('MMMM') ? 'long' : format.includes('MM') ? '2-digit' : undefined,
      day: format.includes('D') ? 'numeric' : undefined,
    });
  });

  // Reading time filter
  eleventyConfig.addFilter("readingTime", function(content) {
    // Remove HTML tags and count words
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200); // Assuming 200 words per minute reading speed
    return minutes;
  });

  // Custom Random Helper Filter (useful for ID attributes)
  eleventyConfig.addFilter("generateRandomIdString", function (prefix) {
    return prefix + "-" + Math.floor(Math.random() * 1000000);
  });

  // Add custom split filter
  eleventyConfig.addFilter("split", function(value, delimiter) {
    if (!value) return [];
    return value.split(delimiter);
  });

  // If you have other `addPlugin` calls, it's important that UpgradeHelper is added last.
	// eleventyConfig.addPlugin(UpgradeHelper);

  /* --- COLLECTIONS --- */

  // Posts collection
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/**/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // Featured posts collection
  eleventyConfig.addCollection("featured", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/**/*.md")
      .filter(post => post.data.featured === true)
      .sort((a, b) => {
        return b.date - a.date;
      });
  });

  /* --- BASE CONFIG --- */

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "includes", // this path is releative to input-path (src/)
      layouts: "layouts", // this path is releative to input-path (src/)
      data: "data", // this path is releative to input-path (src/)
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}