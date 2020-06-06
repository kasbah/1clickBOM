// The contents of this file are subject to the Common Public Attribution
// License Version 1.0 (the “License”); you may not use this file except in
// compliance with the License. You may obtain a copy of the License at
// http://1clickBOM.com/LICENSE. The License is based on the Mozilla Public
// License Version 1.1 but Sections 14 and 15 have been added to cover use of
// software over a computer network and provide for limited attribution for the
// Original Developer. In addition, Exhibit A has been modified to be consistent
// with Exhibit B.
//
// Software distributed under the License is distributed on an
// "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
// the License for the specific language governing rights and limitations under
// the License.
//
// The Original Code is 1clickBOM.
//
// The Original Developer is the Initial Developer. The Original Developer of
// the Original Code is Kaspar Emanuel.

const http = require('./http')
const {browser} = require('./browser')

const retailer_data = {
    Digikey: require('./data/digikey.json'),
    Mouser: require('./data/mouser.json'),
    RS: require('./data/rs.json'),
    Farnell: require('./data/farnell.json'),
    Newark: require('./data/newark.json'),
    LCSC: require('./data/lcsc.json'),
    Rapid: require('./data/rapid.json')
}

class RetailerInterface {
    constructor(name, country_code, data_path, settings, callback) {
        this.country = country_code
        const data = retailer_data[name]
        const country_code_lookedup = data.lookup[country_code]
        if (!country_code_lookedup) {
            const error = new InvalidCountryError()
            error.message += ` '${country_code}' given to ${name}`
            throw error
        }

        if (settings != null) {
            if (settings.carts != null) {
                data.carts = settings.carts
            }
            if (settings.addlines != null) {
                data.addlines = settings.addlines
            }
            if (settings.addline_params != null) {
                data.addline_params = settings.addline_params
            }
            if (settings.name != null) {
                data.name = settings.name
            }
            if (settings.name != null) {
                data.name = settings.name
            }
            if (settings.language != null) {
                data.language = settings.language
            }
        }

        this.settings = settings

        if (typeof data.carts === 'string') {
            this.cart = data.carts
        } else {
            this.cart = data.carts[country_code_lookedup]
        }

        if (typeof data.addlines === 'string') {
            this.addline = data.addlines
        } else {
            this.addline = data.addlines[country_code_lookedup]
        }

        if (data.language != null) {
            this.language = data.language[country_code_lookedup]
        }

        if (settings != null && settings.site != null) {
            this.site = settings.site
        } else {
            this.site = data.sites[country_code_lookedup]
        }

        this.addline_params = data.addline_params
        this.name = name
        this.icon_src = browser.getURL(`images/${this.name.toLowerCase()}.ico`)
        if (callback != null) {
            callback()
        }
    }

    mergeSameSkus(lines) {
        const merged = []
        const warnMerged = []
        for (const line of lines) {
            const existing = merged.findIndex(l => l.part === line.part)
            if (existing != -1) {
                merged[existing].quantity += line.quantity
                merged[existing].reference += ', ' + line.reference
                if (!warnMerged.includes(line.part)) {
                    warnMerged.push(line.part)
                }
            } else {
                merged.push(line)
            }
        }
        const warnings = []
        if (merged.length < lines.length) {
            const s = merged.length > 1 ? 's' : ''
            warnings.push({
                title: `Multiple lines have same ${this.name} part`,
                message:
                    `Quanties and references are merged but expect ${merged.length} line${s} added to cart, not ${lines.length}.` +
                    ` Part${
                        warnMerged.length > 1 ? 's' : ''
                    } with duplicate lines: ${warnMerged}`
            })
        }
        return [merged, warnings]
    }

    refreshCartTabs() {
        //we reload any tabs with the cart URL but the path is case insensitive
        //so we use a regex. we update the matching tabs to the cart URL instead
        //of using tabs.refresh so we don't re-pass any parameters to the cart
        const re = new RegExp(this.cart, 'i')
        return browser.tabsQuery({url: `*${this.site}/*`}, tabs => {
            tabs.forEach(tab => {
                if (tab.url.match(re)) {
                    const protocol = tab.url.split('://')[0]
                    browser.tabsUpdate(tab, protocol + this.site + this.cart)
                }
            })
        })
    }
    refreshSiteTabs() {
        //refresh the tabs that are not the cart url. XXX could some of the
        //passed params cause problems on, say, quick-add urls?
        return browser.tabsQuery({url: `*${this.site}/*`}, tabs => {
            tabs.forEach(tab => {
                browser.tabsReload(tab)
            })
        })
    }

    _open_tab(url) {
        browser.tabsQuery({url: `*${url}*`, currentWindow: true}, tabs => {
            if (tabs && tabs.length > 0) {
                return browser.tabsActivate(tabs[tabs.length - 1])
            } else {
                return browser.tabsCreate('http' + url)
            }
        })
    }

    openCartTab() {
        this._open_tab(this.site + this.cart)
    }
}

class InvalidCountryError extends Error {
    constructor() {
        super()
        this.name = 'InvalidCountryError'
        this.message = 'Invalid country-code'
    }
}

exports.RetailerInterface = RetailerInterface
exports.InvalidCountryError = InvalidCountryError
