# Ghost CMS portal CSS injector

Portal stylesheet injector for Ghost CMS

[![Made with brain](https://img.shields.io/badge/Made%20with-brain%E2%84%A2-orange.svg?style=flat-square)](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
[![GitHub Stars](https://img.shields.io/github/stars/supermarsx/ghost-portal-css-injector?style=flat-square&label=Stars)](#)
[![GitHub Forks](https://img.shields.io/github/forks/supermarsx/ghost-portal-css-injector?style=flat-square&label=Forks)](#)
[![GitHub Watchers](https://img.shields.io/github/watchers/supermarsx/ghost-portal-css-injector?style=flat-square&label=Watchers)](#)
[![GitHub repo size](https://img.shields.io/github/repo-size/supermarsx/ghost-portal-css-injector?style=flat-square&label=Repo%20Size)](#)
[![GitHub Downloads](https://img.shields.io/github/downloads/supermarsx/ghost-portal-css-injector/total.svg?style=flat-square&label=Downloads)](https://codeload.github.com/supermarsx/ghost-portal-css-injector/zip/refs/heads/main)
[![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/supermarsx/ghost-portal-css-injector?style=flat-square&label=Issues)](#)


[**[Download this repository]**](https://codeload.github.com/supermarsx/ghost-portal-css-injector/zip/refs/heads/main)


This is an stylesheet injector "engine" to insert new or override current styles within portal elements that make up the portal plugin in Ghost CMS. This injector allow you to change styling in everything within the portal functionality from the button to login and subscription.

You can change it to inject whatever you want but i made so you're able to inject both styles and fonts as those were the one i wanted to have injected.

There's a bunch of options i've built into the configuration object that you can change around as needed to suit your specific needs, i avoided hardcoding stuff that could've made sense to some extent to be easily changeable.

This injector comes to life as a preferrable alternative to cloning the portal repository and doing all those extra build steps every time there's a new version, i wanted something that i could just kind of "plug" to my theme and go from there without any extra steps.

The portal styles i've included here make the portal go sort of dark mode, the original option that we didn't get from the start.

Every file is documented so you're able to change stuff around.

Also.. this injector is intended to be used in theme development, so to use it per the original idea and intention you either are developing a theme and want to also change the portal theming or you're cloning/modifying and existing theme to better suit your objectives.

This is mostly intended for developers and the like so most regular and advanced users might find it hard to use directly.

You can use this script to inject both styles and fonts to Ghost CMS portal, it's possible to have all sort of different configurations to suit your specific needs.

## Functionality

- Inject `<link>` element in every portal iframe
- Built-in injection persistence and monitoring (observer & watcher)
- Inject all fonts and related HTML elements from the main `<head>` tag
- Logging functionality for debugging and testing purposes
- Extensive configuration object for maximum flexibility
- Automatic file version discovery for smooth injection

## Quick start

To start using the injector you need to download or clone this repository and place the two files under the injector folder in its correct locations according to the information below.

[`portal.css`](https://github.com/supermarsx/ghost-portal-css-injector/blob/main/injector/portal.css) is the main portal stylesheet that you use to override default styles.

[`style-injection.js`](https://github.com/supermarsx/ghost-portal-css-injector/blob/main/injector/style-injection.css) is the main script that injects stylesheets and does all the other magic stuff.

After placing those files in their respective locations you should open each one and read them to adapt the injection to your specific needs.

## Notes

If you're going to use fonts injection the only good workaround to inject them is to add the attribute to every element related to the font(s) in the `.hbs` files, which by default the attribute goes with the selector `[injection-type="font"]`.

## Warranty

No warranties whatsoever.

## License

MIT License. Please check `license.md` for more information.
