/**
 * @fileoverview
 * Utility function to detect locale from the browser setting or paramenter on the URL.
 */

import queryString from 'query-string';

/**
 * look for language setting in the browser. Check against supported locales.
 * If there's a parameter in the URL, override the browser setting
 * @param {Array.string} supportedLocales An array of supported locale codes.
 * @return {string} the preferred locale
 */
// Portugal Portuguese (`pt`, `pt-PT`) is a separate Scratch locale from Brazilian
// Portuguese. This editor is for Brazil, so any Portuguese browser or URL uses pt-br.
const brazilianPortuguese = (locale, supportedLocales) => {
    if ((locale === 'pt' || locale === 'pt-pt') && supportedLocales.includes('pt-br')) {
        return 'pt-br';
    }
    return locale;
};

const detectLocale = supportedLocales => {
    let locale = 'en'; // default
    let browserLocale = window.navigator.userLanguage || window.navigator.language;
    browserLocale = browserLocale.toLowerCase();
    // try to set locale from browserLocale
    if (supportedLocales.includes(browserLocale)) {
        locale = browserLocale;
    } else {
        browserLocale = browserLocale.split('-')[0];
        if (supportedLocales.includes(browserLocale)) {
            locale = browserLocale;
        }
    }
    locale = brazilianPortuguese(locale, supportedLocales);

    const queryParams = queryString.parse(location.search);
    // Flatten potential arrays and remove falsy values
    const potentialLocales = [].concat(queryParams.locale, queryParams.lang).filter(l => l);
    if (!potentialLocales.length) {
        return locale;
    }

    const urlLocale = potentialLocales[0].toLowerCase();
    if (supportedLocales.includes(urlLocale)) {
        return brazilianPortuguese(urlLocale, supportedLocales);
    }

    return locale;
};

export {
    detectLocale
};
