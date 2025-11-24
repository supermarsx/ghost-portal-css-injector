# Ghost CMS portal CSS injector

Portal stylesheet injector for Ghost CMS

[![Made with brain](https://img.shields.io/badge/Made%20with-brain%E2%84%A2-orange.svg?style=flat-square)](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
[![GitHub Stars](https://img.shields.io/github/stars/supermarsx/ghost-portal-css-injector?style=flat-square&label=Stars)](#)
[![GitHub Forks](https://img.shields.io/github/forks/supermarsx/ghost-portal-css-injector?style=flat-square&label=Forks)](#)
[![GitHub Watchers](https://img.shields.io/github/watchers/supermarsx/ghost-portal-css-injector?style=flat-square&label=Watchers)](#)
[![GitHub repo size](https://img.shields.io/github/repo-size/supermarsx/ghost-portal-css-injector?style=flat-square&label=Repo%20Size)](#)
[![GitHub Downloads](https://img.shields.io/github/downloads/supermarsx/ghost-portal-css-injector/total.svg?style=flat-square&label=Downloads)](https://codeload.github.com/supermarsx/ghost-portal-css-injector/zip/refs/heads/main)
[![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/supermarsx/ghost-portal-css-injector?style=flat-square&label=Issues)](#)

[![coverage](https://raw.githubusercontent.com/supermarsx/ghost-portal-css-injector/main/badges/coverage.svg)](https://github.com/supermarsx/ghost-portal-css-injector)

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

[`style-injection.js`](https://github.com/supermarsx/ghost-portal-css-injector/blob/main/injector/style-injection.js) is the main script that injects stylesheets and does all the other magic stuff.

After placing those files in their respective locations you should open each one and read them to adapt the injection to your specific needs.

## Install / Using in a Ghost theme

Follow these steps to add the injector to a Ghost theme. This will inject `portal.css` and (optionally) fonts into the portal iframe so the Portal UI can be styled without cloning or rebuilding the portal repo.

1. Copy the files into your theme's assets folder:
    - `injector/style-injection.js` -> `assets/js/style-injection.js`
    - `injector/portal.css` -> `assets/built/portal.css`

2. Include the portal stylesheet in your theme head with a version query string. The injector extracts the version string from `?v=` in the URL and uses it to build the injection link for portal iframes. Add the link to `partials/head.hbs` or your theme `default.hbs` head block:

    ```html
    <link rel="stylesheet" href="{{asset "built/portal.css"}}?v=1" />
    ```

3. Add and include the injector script in your theme (best placed before the closing `</body>` tag). For example, drop it in `partials/footer.hbs` or `default.hbs`:

    ```html
    <script src="{{asset "js/style-injection.js"}}"></script>

    The script runs at `window.onload` and automatically scans the page for the portal root element, finds the versioned stylesheet in the `head`, and injects the CSS into all portal iframes.

    ```

4. If you want to inject font assets into the portal iframe head, add a `injection-type="font"` attribute to your font elements in the theme `head`. For example:

    Quick autofix (try these to apply changes):

    ```bash
    npm run lint:fix
    npm run format:fix
    ```

    <link rel="preload" href="{{asset "fonts/MyFont.woff2"}}" as="font" type="font/woff2" crossorigin injection-type="font">
    ```

    The injector will clone marked font elements and insert them in the portal iframes.

5. Optional: Customize `style-injection.js`'s `config` object to change selectors, enable/disable features, or adjust watcher/observer behavior. The script contains comments explaining each option.

6. Test the theme:
    - Build and upload your theme to Ghost.
    - Visit the site and open the portal (sign in / membership modal).
    - Check the portal UI; your `portal.css` changes should be applied.
    - For debugging/verification, open the browser console and check for log messages from the injector (the script has a log mode that can be toggled via `config.log.enabled`).

Notes:

- The injector looks for the first versioned resource in the HTML head using a `?v=` query — ensure the `portal.css` link is present in the head to guarantee version extraction and consistent injection.
- If you change versions frequently, bump the `?v=` value to force the injector to use the new file.
- If your theme uses a CSS/JS build pipeline, add the files to your build output folders accordingly (e.g., `assets/built/` and `assets/js/`).

## CI & Releases

This repository contains several GitHub Actions workflows (see `.github/workflows/`) that run on pushes to `main`, pull requests, and manual dispatch. The workflows include separate jobs for:

- `lint` — runs ESLint
- `format` — runs Prettier checks
- `test` — runs Jest tests
- `package` — creates an `npm pack` artifact
- `release` — creates an automatic GitHub release whenever a commit is pushed to `main`.

The release job tags the current commit with the short SHA tag format `v<short_sha>` (example: `v1a2b3c`) and creates a GitHub release with the packaged artifact attached.

Automatic release behavior

- The automatic release job runs only on pushes to `main` and will only create a release if there are code changes in relevant files (`injector/**`, `package.json`, `assets/**`, `*.js`, `*.hbs`). This prevents releases on documentation-only changes or other unrelated edits.
- If you'd like to force a release regardless of changed paths, use the 'Manual Release' workflow dispatch trigger which will create a release for the current commit and upload the packaged artifact.

    Publishing to npm (optional)

    - The release workflow can optionally publish the package to npm if you add an `NPM_TOKEN` repository secret. To enable this behavior:
        1. Create a token with `publish` permission from your npm account and add it to the GitHub repository Secrets as `NPM_TOKEN` (Settings → Secrets and variables → Actions → New repository secret).
        2. Ensure `package.json` does not have `private: true` — the workflow will skip publishing if the `private` key is set to `true`.
        3. Publishing is gated by both the token presence and a change to code-related files; if you want to publish regardless of files changed, use the 'Manual Release' trigger.


If you'd like to manually create a release locally, you can run:

```bash
# create a tag with the short commit
git tag -a v$(git rev-parse --short HEAD) -m "Release"
git push origin --tags
```

And then create a release through the GitHub UI for the created tag.

Running tests & CI locally

- Install dependencies using `npm install` (we intentionally use `npm install` in CI to match your request):

```bash
npm install
```

- Run the test suite with coverage locally:

```bash
npm test
```

The repo includes a test suite that checks the injector script and validates behavior in a DOM-like environment (jsdom). The CI reports coverage for the test run.

## Dev

If you are developing or debugging this project, use the following steps locally:

- Install dependencies:

```bash
npm install
```

- Run lint/format checks:

```bash
npm run lint
npm run format
```

- Run tests and generate coverage (and the coverage badge locally):

```bash
npm test
npm run coverage:badge
```

The badge will be generated at `badges/coverage.svg`. The CI will also generate and commit an updated badge on successful runs when coverage changes.

## Notes

If you're going to use fonts injection the only good workaround to inject them is to add the attribute to every element related to the font(s) in the `.hbs` files, which by default the attribute goes with the selector `[injection-type="font"]`.

## Warranty

No warranties whatsoever.

## License

MIT License. Please check `license.md` for more information.
