/**
 * BloodMallet.com chart system - Main charting component
 *
 * This file contains the chart generation system for bloodmallet.com
 * - BmBarChart: Main bar chart display component
 * - BmRadarChart: Secondary stats radar chart display component
 * - BmChartData: Data and configuration extraction component
 */

const BmChartStyleId = 'bm-chart-styles';
const BmChartStyleUrl = '/static/general_website/css/bm-charts.css';
const BmTooltipJsId = 'bm-tooltip-javascript';
const BmTooltipJsUrl = '/static/general_website/js/bm-tooltips.js';

const BmTooltipClass = {
    TOOLTIP: 'bm-tooltip',
    ARROW: 'bm-tooltip-arrow',
    INNER: 'bm-tooltip-inner',
    TOP: 'bm-tooltip-top',
    BOTTOM: 'bm-tooltip-bottom',
    LEFT: 'bm-tooltip-left',
    RIGHT: 'bm-tooltip-right',
};

const BmTooltipAttribute = {
    ID: 'data-bm-tooltip-id',
    TEXT: 'data-bm-tooltip-text',
    PLACEMENT: 'data-bm-tooltip-placement',
};
const BmTooltipStyleId = 'bm-tooltip-styles';
const BmTooltipStyleUrl = '/static/general_website/css/bm-tooltips.css';

let trinketDataCache = {};
const TRINKET_DATA_CACHE_KEY = 'trinketData';
const TRINKET_DATA_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Check if trinket data cache is still valid
 * @returns {boolean} True if cache is valid
 */
const isTrinketDataCacheValid = () => {
    const timestamp = localStorage.getItem(TRINKET_DATA_CACHE_KEY + '_timestamp');
    return timestamp && Date.now() - parseInt(timestamp, 10) < TRINKET_DATA_CACHE_EXPIRY;
};

/**
 * Load trinket data from cache if valid
 */
const loadTrinketDataCache = () => {
    if (isTrinketDataCacheValid()) {
        trinketDataCache = JSON.parse(localStorage.getItem(TRINKET_DATA_CACHE_KEY)) || {};
    }
};

/**
 * Get trinket comparison data for a specific item and level
 * @param {string} itemName - Trinket name
 * @param {string} itemLevel - Item level
 * @param {string} fightStyle - Fight style
 * @returns {Promise<Object>} - Processed trinket data
 */
const getTrinketDataAsync = async (itemName, itemLevel, fightStyle) => {
    console.debug(`getTrinketDataAsync called with: ${itemName}, ${itemLevel}, ${fightStyle}`);
    let data;
    let firstItemKey;
    let itemData;

    try {
        data = await fetchAndProcessDataAsync(fightStyle);

        // Use provided itemName or get first available
        firstItemKey = Object.keys(data.items).find((key) => key !== 'baseline');
        itemData = data.items[itemName] || data.items[firstItemKey];

        // Use provided itemLevel or get highest available
        const availableLevels = Object.keys(itemData.itemLevels)
            .map((level) => parseInt(level))
            .sort((a, b) => b - a); // Sort descending

        const firstItemLevelKey = availableLevels[0].toString();
        const { sorted_data_keys, ...itemLevelData } =
            itemData.itemLevels[itemLevel] || itemData.itemLevels[firstItemLevelKey];

        return {
            data: {
                ...itemLevelData,
                baseline: itemData.baseline,
            },
            data_type: 'trinket_compare',
            item_name: itemName in data.items ? itemName : firstItemKey,
            item_level: itemLevel in itemData.itemLevels ? itemLevel : firstItemLevelKey,
            item_levels: Object.keys(itemData.itemLevels),
            metadata: data.metadata,
            simc_settings: data.simcSettings,
            sorted_data_keys: sorted_data_keys,
            subtitle: data.subtitle,
            timestamp: data.timestamp,
            translations: itemData.translations,
        };
    } catch (error) {
        console.error('Error in getTrinketDataAsync:', error);
        throw error;
    }
};

/**
 * Fetch and process trinket data for all specs
 * @param {string} fightStyle - Fight style
 * @returns {Promise<Object>} Processed and sorted data
 */
const fetchAndProcessDataAsync = async (fightStyle) => {
    const specs = [
        ['death_knight', 'blood', 'Blood Death Knight'],
        ['death_knight', 'frost', 'Frost Death Knight'],
        ['death_knight', 'unholy', 'Unholy Death Knight'],
        ['demon_hunter', 'havoc', 'Havoc Demon Hunter'],
        ['demon_hunter', 'vengeance', 'Vengeance Demon Hunter'],
        ['druid', 'balance', 'Balance Druid'],
        ['druid', 'feral', 'Feral Druid'],
        ['druid', 'guardian', 'Guardian Druid'],
        // ["evoker", "augmentation", "Augmentation Evoker"],
        ['evoker', 'devastation', 'Devastation Evoker'],
        ['hunter', 'beast_mastery', 'Beast Mastery Hunter'],
        ['hunter', 'marksmanship', 'Marksmanship Hunter'],
        ['hunter', 'survival', 'Survival Hunter'],
        ['mage', 'arcane', 'Arcane Mage'],
        ['mage', 'fire', 'Fire Mage'],
        ['mage', 'frost', 'Frost Mage'],
        ['monk', 'brewmaster', 'Brewmaster Monk'],
        ['monk', 'windwalker', 'Windwalker Monk'],
        ['paladin', 'protection', 'Protection Paladin'],
        ['paladin', 'retribution', 'Retribution Paladin'],
        ['priest', 'shadow', 'Shadow Priest'],
        ['rogue', 'assassination', 'Assassination Rogue'],
        ['rogue', 'outlaw', 'Outlaw Rogue'],
        ['rogue', 'subtlety', 'Subtlety Rogue'],
        ['shaman', 'elemental', 'Elemental Shaman'],
        ['shaman', 'enhancement', 'Enhancement Shaman'],
        ['warlock', 'affliction', 'Affliction Warlock'],
        ['warlock', 'demonology', 'Demonology Warlock'],
        ['warlock', 'destruction', 'Destruction Warlock'],
        ['warrior', 'arms', 'Arms Warrior'],
        ['warrior', 'fury', 'Fury Warrior'],
        ['warrior', 'protection', 'Protection Warrior'],
    ];

    loadTrinketDataCache();
    const cacheKey = `${fightStyle}`;
    if (trinketDataCache[cacheKey]) {
        return trinketDataCache[cacheKey];
    }

    const data = {};
    const promises = specs.map(async ([wowClass, wowSpec, key]) => {
        const response = await fetch(`https://bloodmallet.com/chart/get/trinkets/${fightStyle}/${wowClass}/${wowSpec}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        data[key] = await response.json();
    });

    await Promise.all(promises);

    const processedData = processData(data);
    const sortedData = sortData(processedData);

    trinketDataCache[cacheKey] = sortedData;
    localStorage.setItem(TRINKET_DATA_CACHE_KEY, JSON.stringify(trinketDataCache));
    localStorage.setItem(TRINKET_DATA_CACHE_KEY + '_timestamp', Date.now());

    return sortedData;
};

/**
 * Process raw trinket data into a structured format
 * @param {Object} data - Raw data from API
 * @returns {Object} Processed data
 */
const processData = (data) => {
    const processedData = {
        items: {},
        metadata: null,
        simcSettings: null,
        subtitle: null,
        timestamp: null,
    };

    Object.entries(data).forEach(([className, entry]) => {
        if (entry.status === 'error') {
            return;
        }

        // Process the trinket data
        Object.entries(entry.data).forEach(([itemName, itemLevels]) => {
            const itemKey = itemName.toLowerCase().replace(/ /g, '_');
            const items = processedData.items;
            items[itemKey] = items[itemKey] || {};
            const item = items[itemKey];

            // Set Translations
            if (!item.translations) {
                item.translations = entry.translations[itemName];
            }

            // Set Baseline
            item.baseline = item.baseline || {};
            item.baseline[className] = Object.values(entry.data.baseline)[0];

            // Set Item Levels
            item.itemLevels = item.itemLevels || {};
            for (const [itemLevel, dps] of Object.entries(itemLevels)) {
                item.itemLevels[itemLevel] = item.itemLevels[itemLevel] || {};
                item.itemLevels[itemLevel][className] = dps;
            }
        });

        processedData.metadata = entry.metadata;
        processedData.simcSettings = entry.simc_settings;
        processedData.subtitle = entry.subtitle;
        processedData.timestamp = entry.timestamp;
    });

    return processedData;
};

/**
 * Sort data entries by DPS values
 * @param {Object} data - Processed data
 * @returns {Object} Sorted data
 */
const sortData = (data) => {
    const sortedData = {
        items: {},
        metadata: data.metadata,
        simcSettings: data.simcSettings,
        subtitle: data.subtitle,
        timestamp: data.timestamp,
    };

    for (const itemName in data.items) {
        sortedData.items[itemName] = {
            itemLevels: {},
            translations: data.items[itemName].translations,
            baseline: data.items[itemName].baseline,
        };
        for (const itemLevel in data.items[itemName].itemLevels) {
            const sortedSpecs = Object.entries(data.items[itemName].itemLevels[itemLevel]).sort((a, b) => b[1] - a[1]);
            sortedData.items[itemName].itemLevels[itemLevel] = Object.fromEntries(sortedSpecs);
            sortedData.items[itemName].itemLevels[itemLevel].sorted_data_keys = Object.keys(
                Object.fromEntries(sortedSpecs)
            );
        }
    }
    return sortedData;
};

/**
 * Register all tooltip-events.
 * @param {Element} element
 */
function bm_register_tooltip(element) {
    if (element.hasAttribute(BmTooltipAttribute.ID)) {
        // console.log(BmTooltipAttribute.ID + " found. Tooltip was already registered. Skipping registration of tooltip.");
        return;
    }

    /**
     * Generate a random int.
     * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
     * @param {number} max
     * @returns
     */
    function get_random_int(max) {
        return Math.floor(Math.random() * max);
    }

    function get_unique_random_int() {
        const max = 999999;
        let random_id = get_random_int(max);
        while (document.querySelectorAll(`[${BmTooltipAttribute.ID}='bm-tooltip-${random_id}']`).length !== 0) {
            console.debug(`We won! Somehow ID ${random_id} was already in use. Regenerating a new ID.`);
            random_id = get_random_int(max);
        }
        return random_id;
    }

    /**
     * Remove tooltip-div
     * @param {Element} element
     */
    function remove_tooltip_div(element) {
        const id = element.getAttribute(BmTooltipAttribute.ID);
        if (!document.getElementById(id)) {
            return;
        }
        document.getElementById(id).remove();
    }

    // /**
    //  * Create a tooltip-div
    //  * @param {Event} event
    //  * @param {Element} element
    //  * @param {number} random_id
    //  */
    function injectTooltip(event, element) {
        // console.log(event);
        if (!element.hasAttribute(BmTooltipAttribute.TEXT)) {
            console.warn(`${BmTooltipAttribute.TEXT} not found. Skipping tooltip.`);
            return;
        }

        remove_tooltip_div(element); // Clear existing tooltip

        const id = element.getAttribute(BmTooltipAttribute.ID);
        const tooltipHTML = element.getAttribute(BmTooltipAttribute.TEXT);
        const placementAttr = element.getAttribute(BmTooltipAttribute.PLACEMENT);

        const placement = BmUIUtils.getTooltipPlacementClass(placementAttr);
        const tooltipContent = BmUIUtils.htmlToElement(tooltipHTML);

        const root = BmUIUtils.createDiv(
            `${BmTooltipClass.TOOLTIP} ${placement}`,
            [BmUIUtils.createDiv(BmTooltipClass.ARROW), BmUIUtils.createDiv(BmTooltipClass.INNER, tooltipContent)],
            {
                id: id,
            }
        );

        document.body.appendChild(root);

        const { x, y } = BmUIUtils.getTooltipPosition(element, root, placement);
        root.style = `transform: translate(${x}px, ${y}px);`;
    }

    /**
     *
     * @param {Element} element
     */
    function set_tooltip_id(element) {
        const random_id = get_unique_random_int();
        const id = 'bm-tooltip-' + random_id.toString();
        element.setAttribute(BmTooltipAttribute.ID, id);
    }

    BmUIUtils.addCSS(BmTooltipStyleId, BmTooltipStyleUrl);

    set_tooltip_id(element);
    element.addEventListener('mouseover', (event) => {
        injectTooltip(event, element);
    });

    // remove tooltip again
    element.addEventListener('mouseleave', (event) => {
        remove_tooltip_div(element);
    });
}

/**
 * Ensures environment is prepared for bm-tooltips then registers all
 * discovered tooltip targets.
 */
function bm_register_tooltips() {
    const tooltip_elements = document.querySelectorAll("[data-type='bm-tooltip']");
    for (const element of tooltip_elements) {
        bm_register_tooltip(element);
    }
}

/**
 * Add bloodmallet tooltip js to page and execute `bm_register_tooltips`.
 */
function add_bm_tooltips_to_dom() {
    BmUIUtils.addCSS(BmTooltipJsId, BmTooltipJsUrl);

    try {
        bm_register_tooltips();
    } catch (e) {
        const script = document.getElementById(BmTooltipJsId);
        script.addEventListener('load', () => {
            bm_register_tooltips();
        });
        script.addEventListener('error', (error) => {
            console.error(error);
        });
    }
}

/**
 * Main chart data extractor and configuration class
 * Extracts and provides access to data required for chart rendering
 */
class BmChartData {
    /**
     * Root element containing the chart
     * @type {HTMLElement}
     */
    root_element;

    /**
     * Data loaded from the API or backend
     */
    loaded_data = {};

    // Data properties extracted from loaded_data
    /**
     * e.g. "Trinkets | Elemental Shaman | Castingpatchwerk"
     */
    title = '';
    /**
     * e.g. Datetime of creation, simc-hash
     */
    subtitle = '';
    /**
     * SimulationCraft hash, e.g. 567hj0
     */
    simc_hash = '';
    /**
     * e.g. Itemlevels
     */
    legend_title = '';
    /**
     * e.g.
     *  - "My Trinket": {260: 12000, 270: 12500, 280: 13200, ...}
     *  - "My Race": 1200
     *  - "my-profile": {"10_10_10_70": 200100, ...}
     */
    data = {};
    /**
     * Name of the super-key to filter data to the relevant set for multi-char simulations.
     * Could also be called "profile".
     * e.g. "profile-name": {"My Trinket": {260: 12000, 270: 12500, 280: 13200}}
     *       ^^^^^^^^^^^^
     */
    selected_data_key = 'baseline';
    /**
     * e.g. "My Trinket": {"cn_CN": "心能力场发生器",}
     */
    language_dict = {};
    /**
     * e.g. "My Spell": 123456
     */
    spell_id_dict = {};
    /**
     * e.g. "My trinket": 123456
     */
    item_id_dict = {};
    /**
     * e.g. 260, 270, 280
     */
    series_names = [];
    /**
     * e.g. ["My Trinket", "Other Trinket"]
     */
    sorted_data_keys = [];
    /**
     * e.g. {"Talent Tree 1": ["10_10_10_70", ...], ...}
     */
    sorted_data_data_keys = {};
    /**
     * e.g. {260: 11400, 270: 11400, 280: 11400}
     */
    base_values = {};

    // Settings

    /**
     * options: "cn_CN", "de_DE", "en_US", "es_ES", "fr_FR", "it_IT", "ko_KR", "pt_BR", "ru_RU"
     */
    language = 'en_US';
    /**
     * e.g. % damage per second, see `x_axis_texts`
     */
    x_axis_title = '';
    /**
     * e.g. Trinket - not visible anywhere
     */
    y_axis_title = '';
    /**
     * either "total", "relative", or "absolute"
     */
    value_calculation = 'total';

    // Calculated values

    /**
     * max dps value found in `data`
     */
    global_max_value = -1;

    // Constants
    unit = {
        total: '',
        relative: '%',
        absolute: 'Δ',
    };

    x_axis_texts = {
        total: 'total damage per second (character)',
        relative: '% damage per second',
        absolute: 'absolute damage per second',
    };

    /**
     * e.g. trinkets, secondary_distributions, races,...
     */
    data_type = '';
    wow_spec = '';
    wow_class = '';
    secondary_sum = -1;

    data_type_defaults = {
        trinkets: {
            value_calculation: 'relative',
        },
        phials: {
            value_calculation: 'relative',
        },
        potions: {
            value_calculation: 'relative',
        },
        power_infusion: {
            value_calculation: 'absolute',
        },
        windfury_totem: {
            value_calculation: 'absolute',
        },
        trinket_compare: {
            value_calculation: 'absolute',
        },
        talent_target_scaling: {
            value_calculation: 'total',
        },
        weapon_enchantments: {
            value_calculation: 'relative',
        },
    };

    // Filter settings
    /**
     * list elements remove matching data
     * e.g. "trinkets": {"itemlevels": [284]} will remove all itemlevel 284
     * trinket data from charts visualization
     */
    /**
     * Remove listed itemlevels from trinket chart
     * @type {Array<Number>}
     */
    filter_trinket_itemlevels = [];
    /**
     * Remove listed sources from trinket chart
     * @type {Array<String>}
     */
    filter_trinket_sources = [];
    /**
     * Remove active trinkets if list contains "active". Remove passive
     * trinkets if list contains "passive". If both words are in the list no
     * trinkets will be shown.
     * @type {Array<String>}
     */
    filter_trinket_active_passive = [];

    /**
     * Limits the chart to show only the top X elements
     */
    show_top = 5;

    // Display flags
    enable_title = true;
    enable_subtitle = true;
    enable_simc_subtitle = true;
    enable_tooltips = true;
    enable_legend = false;
    enable_end_of_bar_values = false;

    /**
     * Extract the value from `key_chain` of `loaded_data` and stores it in class as `property`.
     * @param {String} property - Name of the property to be set on this class
     * @param {Array<String>} key_chain - Nested keys in loaded_data to get the value for `property`
     */
    _extract_data_from_loaded_data(property, key_chain) {
        let could_descend = true;
        let descend = this.loaded_data;
        for (const key of key_chain) {
            if (descend.hasOwnProperty(key)) {
                descend = descend[key];
            } else {
                could_descend = false;
                break;
            }
        }
        if (could_descend) {
            this[property] = descend;
        }
    }

    /**
     * Extract the value of `key` of the root html element dataset and stores it in class as `property`.
     * @param {String} property - Name of the property to be set on this class
     * @param {String} key - Name of the dataset key containing the wanted value
     * @param {Function} converter - Function to convert the value
     */
    _extract_setting_from_root_element(property, key, converter = (v) => v) {
        if (this.root_element.dataset.hasOwnProperty(key)) {
            this[property] = converter(this.root_element.dataset[key]);
        }
    }

    /**
     * Set `property` of BmChartData to a data_type appropriate default, if present.
     * @param {String} property - A BmChartData property that might be part of data_type_defaults
     */
    _set_default_from_data_type(property) {
        if (
            this.data_type_defaults.hasOwnProperty(this.data_type) &&
            this.data_type_defaults[this.data_type].hasOwnProperty(property)
        ) {
            this[property] = this.data_type_defaults[this.data_type][property];
        }
    }

    /**
     * Set subtitle from data
     */
    _set_subtitle() {
        const subtitle_parts = [];
        if (this.loaded_data.hasOwnProperty('profile')) {
            subtitle_parts.push(
                this.loaded_data['profile']['character']['spec'] +
                    ' ' +
                    this.loaded_data['profile']['character']['class']
            );
        }
        subtitle_parts.push(this.loaded_data['simc_settings']['fight_style']);
        subtitle_parts.push('UTC ' + this.loaded_data['metadata']['timestamp']);

        this.subtitle = subtitle_parts.join(' | ');
    }

    /**
     * Set title for trinket compare chart type
     */
    _setTrinketCompareTitle() {
        // Extract the item name
        this._extract_data_from_loaded_data('item_name', ['item_name']);

        // Default formatting as fallback
        const formatItemName = (name) => name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        // If no translations are available, use formatted name
        if (!this.loaded_data.translations) {
            this.title = formatItemName(this.item_name);
            return;
        }

        // Try to get item-specific translations
        const itemTranslations = this.loaded_data.translations[this.item_name];
        if (itemTranslations) {
            // Try current language first, then fall back to English
            this.title = itemTranslations[this.language] || itemTranslations['en_US'] || formatItemName(this.item_name);
            return;
        }

        // Try top-level translations
        this.title =
            this.loaded_data.translations[this.language] ||
            this.loaded_data.translations['en_US'] ||
            formatItemName(this.item_name);
    }

    /**
     * Add title to element
     * @param {HTMLElement} element - Target element
     */
    add_title(element) {
        if (!this.enable_title) {
            return;
        }

        const title = BmUIUtils.createDiv('bm-title', this.title);
        element.appendChild(title);
    }

    /**
     * Add subtitle to element
     * @param {HTMLElement} element - Target element
     */
    add_subtitle(element) {
        if (!this.enable_subtitle) {
            return;
        }

        const subtitle = BmUIUtils.createDiv('bm-subtitle', this.subtitle);
        element.appendChild(subtitle);
    }

    /**
     * Add SimC subtitle with hash to element
     * @param {HTMLElement} element - Target element
     */
    add_simc_subtitle(element) {
        if (!this.enable_simc_subtitle) {
            return;
        }
        const simc_subtitle = BmUIUtils.createDiv('bm-subtitle', 'SimulationCraft hash: ');

        const link = document.createElement('a');
        link.href = 'https://github.com/simulationcraft/simc/commit/' + this.simc_hash;
        link.text = '#' + this.simc_hash;
        simc_subtitle.appendChild(link);

        element.appendChild(simc_subtitle);
    }

    /**
     * Create a new chart data object
     * @param {HTMLElement} root_element - The element containing chart data
     */
    constructor(root_element = new HTMLElement()) {
        /**
         * Contains the root html element. Data was extracted from it.
         */
        this.root_element = root_element;

        if (
            !this.root_element.dataset.hasOwnProperty('loadedData') ||
            (this.root_element.dataset.hasOwnProperty('loadedData') && this.root_element.dataset.loadedData === '')
        ) {
            throw new Error('Data must be loaded in Element before attempting to create the associated chart.');
        }

        try {
            this.loaded_data = JSON.parse(this.root_element.dataset.loadedData);

            if (this.loaded_data.status === 'error' && this.loaded_data.message !== undefined) {
                console.error('bm-charts encountered an error while loading data. Error:', this.loaded_data.message);
                return;
            }

            this._extract_data_from_loaded_data('data_type', ['data_type']);
            this._extract_data_from_loaded_data('element_id', ['element_id']);
            this._extract_setting_from_root_element('language', 'language');
            this.language = BmUIUtils.detectUserLanguage(this.root_element);

            if (this.data_type === 'trinket_compare') {
                this._setTrinketCompareTitle();
            } else {
                // For all other chart types, use the standard method
                this._extract_data_from_loaded_data('title', ['data_type']);
            }

            this._set_subtitle();
            this._extract_data_from_loaded_data('simc_hash', ['metadata', 'SimulationCraft']);

            // Set legend title based on chart type
            if (this.data_type === 'races') {
                this.legend_title = 'Race';
            } else if (['trinkets'].includes(this.data_type)) {
                this.legend_title = 'Itemlevels';
            } else if (['phials', 'potions', 'weapon_enchantments'].includes(this.data_type)) {
                this.legend_title = 'Ranks';
            } else if (this.data_type === 'talent_target_scaling') {
                this.legend_title = 'Targets';
            } else if (['windfury_totem', 'power_infusion', 'trinket_compare'].includes(this.data_type)) {
                this.legend_title = 'Effect';
            } else {
                this.legend_title = 'legend_title not set';
            }

            this._extract_data_from_loaded_data('legend_title', ['legend_title']);
            this._extract_data_from_loaded_data('data', ['data']);
            this._set_default_from_data_type('value_calculation');
            this._extract_setting_from_root_element('value_calculation', 'valueCalculation');
            this._extract_setting_from_root_element('selected_data_key', 'selectedDataKey');

            // Set sole data point as selected data for secondary distributions
            if (Object.keys(this.data).indexOf(this.selected_data_key) === -1) {
                this.selected_data_key = Object.keys(this.data)[0];
            }

            this.x_axis_title = this.x_axis_texts[this.value_calculation];
            this._extract_data_from_loaded_data('x_axis_title', ['x_axis_title']);
            this._extract_data_from_loaded_data('y_axis_title', ['y_axis_title']);
            this._extract_data_from_loaded_data('wow_spec', ['profile', 'character', 'spec']);
            this._extract_data_from_loaded_data('wow_class', ['profile', 'character', 'class']);
            this._extract_data_from_loaded_data('secondary_sum', ['secondary_sum']);

            // Extract series names - optional
            this._extract_data_from_loaded_data('series_names', ['simulated_steps']);
            if (this.series_names.length === 0) {
                for (const key_value_object of Object.values(this.data)) {
                    for (const series of Object.keys(key_value_object)) {
                        const parsed_int = Number.parseInt(series);
                        if (this.series_names.indexOf(parsed_int) === -1 && parsed_int.toString() === series) {
                            // Series are numbers, e.g. itemlevels or ranks
                            this.series_names.push(parsed_int);
                        } else if (this.series_names.indexOf(series) === -1 && parsed_int.toString() !== series) {
                            // Series are words, e.g. 10_10_10_70 from secondary distribution charts
                            this.series_names.push(series);
                        }
                    }
                }
            }
            this.series_names.sort((a, b) => a - b);

            // Extract sorted data keys - optional
            this._extract_data_from_loaded_data('sorted_data_keys', ['sorted_data_keys']);
            if (this.sorted_data_keys.length === 0) {
                const key_value = {};
                for (const key of Object.keys(this.data)) {
                    key_value[key] = Math.max(...Object.values(this.data[key]));
                }
                this.sorted_data_keys = Object.keys(key_value).sort((a, b) => key_value[b] - key_value[a]);
            }
            this._extract_data_from_loaded_data('sorted_data_data_keys', ['sorted_data_keys']);

            // Handle base values - optional
            // create if no keys
            // extend if number of keys === 1 and number of series_names > 1
            this._extract_data_from_loaded_data('base_values', ['data', 'baseline']);
            if (Object.keys(this.base_values).length === 0) {
                // No base_values found, default to 0
                for (const series of this.series_names) {
                    this.base_values[series] = 0;
                }
            } else if (Object.keys(this.base_values).length === 1 && this.series_names.length > 1) {
                // One base_value found but multiple series, use same value for all
                const tmp_value = Object.values(this.base_values)[0];
                for (const series of this.series_names) {
                    this.base_values[series] = tmp_value;
                }
            } else if (Object.keys(this.base_values).length == this.series_names.length) {
                // As many base_values as series_names - do nothing
            } else {
                throw (
                    'base_value must be an empty object, have only one key, or the same length and keys as series_names.' +
                    this.data_type
                );
            }

            // Extract optional data
            this._extract_data_from_loaded_data('language_dict', ['translations']);
            this._extract_data_from_loaded_data('item_id_dict', ['item_ids']);
            this._extract_data_from_loaded_data('spell_id_dict', ['spell_ids']);
            this._extract_setting_from_root_element('show_top', 'showTop', this._convert_to_number);
            this._extract_setting_from_root_element(
                'filter_trinket_itemlevels',
                'filterTrinketItemlevels',
                this._convert_to_number_list
            );
            this._extract_setting_from_root_element(
                'filter_trinket_sources',
                'filterTrinketSources',
                this._convert_to_string_list
            );
            this._extract_setting_from_root_element(
                'filter_trinket_active_passive',
                'filterTrinketActivePassive',
                this._convert_to_string_list
            );
            this._extract_setting_from_root_element('enable_title', 'enableTitle', this._convert_to_bool);
            this._extract_setting_from_root_element('enable_subtitle', 'enableSubtitle', this._convert_to_bool);
            this._extract_setting_from_root_element(
                'enable_simc_subtitle',
                'enableSimcSubtitle',
                this._convert_to_bool
            );
            this._extract_setting_from_root_element('enable_tooltips', 'enableTooltips', this._convert_to_bool);
            this._extract_setting_from_root_element('enable_legend', 'enableLegend', this._convert_to_bool);

            // Calculate global max value based on chart type
            if (this.data_type === 'races') {
                this.global_max_value = Math.max(...Object.values(this.data));
            } else if (['power_infusion', 'windfury_totem', 'trinket_compare'].indexOf(this.data_type) > -1) {
                let biggest_diff = 0;
                let base_value = 0;
                let local_diff = 0;

                for (const spec of this.sorted_data_keys) {
                    base_value = this.base_values[spec] || this.data['{' + spec + '}'];

                    if (this.value_calculation === 'relative') {
                        local_diff = this.get_relative_gain(this.data[spec], base_value);
                    } else {
                        local_diff = this.data[spec] - base_value;
                    }

                    if (biggest_diff < local_diff) {
                        biggest_diff = local_diff;
                    }
                }

                this.global_max_value = biggest_diff;
            } else {
                this.global_max_value = Math.max(
                    ...Object.values(this.data).map((element) => Math.max(...Object.values(element)))
                );
            }
        } catch (error) {
            console.error('Error in BmChartData constructor:', error);
            throw error;
        }
    }

    /**
     * Convert string value to boolean
     * @param {String} input - Input string
     * @returns {Boolean} Boolean value
     */
    _convert_to_bool(input) {
        return input.toLowerCase() === 'true';
    }

    /**
     * Convert semicolon-separated string to array of strings
     * @param {String} input - Input string
     * @returns {Array<String>} Array of strings
     */
    _convert_to_string_list(input) {
        return input.split(';');
    }

    /**
     * Convert semicolon-separated string to array of numbers
     * @param {String} input - Input string
     * @returns {Array<Number>} Array of numbers
     */
    _convert_to_number_list(input) {
        return input.split(';').map((value) => Number.parseInt(value));
    }

    /**
     * Convert string to number
     * @param {String} input - Input string
     * @returns {Number} Number value
     */
    _convert_to_number(input) {
        return Number.parseInt(input);
    }

    /**
     * Format number using locale and precision
     * @param {Number} value - Value to format
     * @param {Number} mantissa - Number of decimal places
     * @returns {String} Formatted number
     */
    convert_number_to_local(value, mantissa = 2) {
        return BmUIUtils.formatNumber(value, mantissa);
    }

    /**
     * Calculate relative value compared to base
     * @param {Number} changed_value - Changed value
     * @param {Number} base_value - Base value
     * @returns {Number} Relative value
     */
    _get_relative_value(changed_value, base_value) {
        return (changed_value * 100) / base_value;
    }

    /**
     * Calculate relative gain as percentage difference
     * E.g. changed_value=80, base_value=100 => -20 (%)
     * @param {Number} changed_value - Changed value
     * @param {Number} base_value - Base value
     * @returns {Number} Percentage gain
     */
    get_relative_gain(changed_value, base_value) {
        const relative_gain = this._get_relative_value(changed_value, base_value);
        return relative_gain - 100.0;
    }

    /**
     * Calculate absolute gain (positive only)
     * @param {Number} changed_value - Changed value
     * @param {Number} base_value - Base value
     * @returns {Number} Absolute gain (minimum 0)
     */
    get_absolute_gain(changed_value, base_value) {
        const value = changed_value - base_value;
        return value > 0 ? value : 0;
    }

    /**
     * Get translated name for a key
     * @param {String} key - Key to translate
     * @returns {String} Translated name
     */
    get_translated_name(key) {
        if (key in this.language_dict && this.language in this.language_dict[key]) {
            return this.language_dict[key][this.language];
        } else {
            return key;
        }
    }

    /**
     * Build wowhead URL for an item or spell
     * @param {String} key - Item or spell name
     * @returns {String|undefined} URL to wowhead or undefined
     */
    _get_wowhead_url(key) {
        const subdomain = BmUIUtils.getWowheadSubdomain(this.language);
        let base = `https://${subdomain}.wowhead.com/`;

        if (key in this.spell_id_dict) {
            base += 'spell=' + this.spell_id_dict[key];
        } else if (key in this.item_id_dict) {
            base += 'item=' + this.item_id_dict[key];
        } else {
            return undefined;
        }

        return base;
    }

    /**
     * Shorten display name preserving special information in brackets
     * @param {String} name - Name to shorten
     * @returns {String} Shortened name
     */
    _shorten_name(name) {
        if (name.length < 20) {
            return name;
        }
        // might need to remove this
        if (!name.includes('[')) {
            return name;
        }

        const to_be_shortened = name.split('[')[0].trim();
        const specifier = name.split('[')[1].split(']')[0];
        const name_sections = to_be_shortened.split(':');
        const name_section_parts = [];

        for (const name_section of name_sections) {
            name_section_parts.push(
                name_section
                    .trim()
                    .split(' ')
                    .map((part) => part[0])
            );
        }

        let new_name = '';
        for (const characters of name_section_parts) {
            if (new_name !== '') {
                new_name += ':';
            }
            new_name += characters.join('');
        }

        new_name += ' [' + specifier + ']';
        return new_name;
    }

    /**
     * Get a wowhead link for a key
     * @param {String} key - Base (English) name
     * @returns {HTMLElement} Translated link with tooltip information
     */
    get_wowhead_link(key) {
        let translated_name = this.get_translated_name(key);
        translated_name = this._shorten_name(translated_name);

        const translated_name_node = document.createTextNode(translated_name);
        const url = this._get_wowhead_url(key);
        if (url === undefined) {
            return translated_name_node;
        }
        const link = document.createElement('a');
        link.href = url;
        link.appendChild(translated_name_node);
        return link;
    }

    /**
     * Get the DPS value based on calculation type
     * @param {String} key - Data key
     * @param {String|Number} series - Series key
     * @param {String} value_calculation - Calculation method (total, absolute, relative)
     * @returns {Number} Calculated value
     */
    get_value(key, series, value_calculation) {
        if (value_calculation === 'total') {
            return this.data[key][series];
        } else if (value_calculation === 'absolute') {
            return this.get_absolute_gain(this.data[key][series], this.base_values[series]);
        } else if (value_calculation === 'relative') {
            // Special case for augmentation evokers to compare the gain to
            // their own base dps without the group dps
            let relative_gain = -1;
            if (this.wow_class === 'evoker' && this.wow_spec === 'augmentation') {
                const aug_base_value = this.loaded_data['profile']['metadata']['base_dps'];
                const raw_gain = this.get_absolute_gain(this.data[key][series], this.base_values[series]);
                // console.log("augmentation had a raw gain of", raw_gain, "dps compared to its own max dps of", aug_base_value);
                relative_gain = this.get_relative_gain(aug_base_value + raw_gain, aug_base_value);
            } else {
                relative_gain = this.get_relative_gain(this.data[key][series], this.base_values[series]);
            }
            return relative_gain;
        }
    }

    /**
     * Add tooltip to element
     * @param {HTMLElement} element - Element to add tooltip to
     * @param {String} tooltip - Tooltip content
     * @param {String} position - Tooltip position
     */
    add_tooltip(element, tooltip, position = 'right') {
        if (!this.enable_tooltips) {
            return;
        }
        element.setAttribute('data-type', 'bm-tooltip');
        element.setAttribute('data-bm-tooltip-text', tooltip);
        element.setAttribute('data-bm-tooltip-placement', position);
    }

    /**
     * Clear content from root element
     */
    clean_up_root() {
        this.root_element.innerHTML = '';
        // while (this.root_element.hasChildNodes()) {
        //     this.root_element.removeChild(this.root_element.firstChild);
        // }
    }
}

/**
 * Data collector class. Contains all information provided by the html element element_id.
 */
class BmBarChart {
    /**
     * Chart data
     * @type {BmChartData}
     */
    bmChartData;

    /**
     * Vertical comparison line
     * @type {HTMLElement}
     */
    verticalLine;

    /**
     * Create a new bar chart
     * @param {BmChartData} chart_data - Chart data
     */
    constructor(chart_data = new BmChartData()) {
        this.verticalLine = undefined;
        this.bmChartData = chart_data;

        this.bmChartData.clean_up_root();
        this.create_chart();

        try {
            $WowheadPower.refreshLinks();
        } catch (error) {
            console.error('Error refreshing WowheadPower links:', error);
        }

        add_bm_tooltips_to_dom();
        BmUIUtils.addCSS(BmChartStyleId, BmChartStyleUrl);

        if (['bloodmallet.com', '127.0.0.1:8000'].includes(window.location.host)) {
            try {
                provide_meta_data(this.bmChartData, this.bmChartData.loaded_data);
            } catch (error) {
                console.log('Failed to provide metadata to bloodmallet.com:', error);
            }
        }
    }

    /**
     * Create the complete chart
     */
    create_chart() {
        // Filter out unwanted data
        const effective_series_index_names = Array.from(this.bmChartData.series_names.entries()).filter(
            ([index, series]) => !this.bmChartData.filter_trinket_itemlevels.includes(series)
        );

        // Process data keys with filters
        let effective_sorted_data_keys = this.processDataKeys();

        // Limit the number of displayed data points
        // If show_top is set to 0, all data points are shown
        if (this.bmChartData.show_top > 0) {
            effective_sorted_data_keys = effective_sorted_data_keys.slice(0, this.bmChartData.show_top);
        }

        // Setup chart container
        const root = this.bmChartData.root_element;
        root.classList.add('bm-bar-chart');

        // Add header elements
        this.bmChartData.add_title(root);
        this.bmChartData.add_subtitle(root);
        this.bmChartData.add_simc_subtitle(root);

        // Add legend
        const legend = BmChartComponents.createLegend(this.bmChartData, effective_series_index_names);
        if (legend) {
            root.appendChild(legend);
        }

        // Add axis titles
        const axis_titles = BmChartComponents.createAxisTitles(this.bmChartData);
        root.appendChild(axis_titles);

        // actual data / bars
        for (const key of effective_sorted_data_keys) {
            const row = BmUIUtils.createDiv(
                'bm-row',
                BmUIUtils.createDiv('bm-key', this.bmChartData.get_wowhead_link(key))
            );

            const bar = BmUIUtils.createDiv('bm-bar');
            // add bar elements
            const steps = [];
            let previous_value = 0;
            // chart types without multiple series
            if (this.bmChartData.data_type === 'races') {
                // absolute calc
                const relative_value = (this.bmChartData.data[key] * 100) / this.bmChartData.global_max_value;
                if (relative_value - previous_value >= 0.0) {
                    steps.push(relative_value - previous_value);
                    previous_value = relative_value;
                } else {
                    steps.push(0);
                }

                const bar_part = BmUIUtils.createDiv('bm-bar-element bm-bar-group-1');
                bar_part.addEventListener('click', (ev) => {
                    BmChartComponents.createVerticalLine(ev);
                });

                bar.appendChild(bar_part);
            } else if (
                ['power_infusion', 'windfury_totem', 'trinket_compare'].indexOf(this.bmChartData.data_type) > -1
            ) {
                let value = 0;
                const base_value = this.bmChartData.base_values[key] || this.bmChartData.data['{' + key + '}'];

                if (this.bmChartData.value_calculation === 'relative') {
                    //  relative
                    value =
                        ((((this.bmChartData.data[key] - base_value) * 100) / this.bmChartData.data[key]) * 100) /
                        this.bmChartData.global_max_value;
                } else {
                    // absolute calc
                    value = ((this.bmChartData.data[key] - base_value) * 100) / this.bmChartData.global_max_value;
                }
                if (value - previous_value >= 0.0) {
                    steps.push(value - previous_value);
                    previous_value = value;
                } else {
                    steps.push(0);
                }

                const bar_part = BmUIUtils.createDiv('bm-bar-element bm-bar-group-1');
                bar_part.addEventListener('click', (ev) => {
                    BmChartComponents.createVerticalLine(ev);
                });

                bar.appendChild(bar_part);
            }
            for (const [index, series] of effective_series_index_names) {
                if (!this.bmChartData.data[key].hasOwnProperty(series)) {
                    // data doesn't have series element, skipping
                    continue;
                }
                // relative calc
                const relative_value =
                    ((this.bmChartData.data[key][series] - this.bmChartData.base_values[series]) * 100) /
                    (this.bmChartData.global_max_value - this.bmChartData.base_values[series]);
                if (relative_value - previous_value >= 0.0) {
                    steps.push(relative_value - previous_value);
                    previous_value = relative_value;
                } else {
                    steps.push(0);
                }
                const bar_part = BmUIUtils.createDiv(`bm-bar-element bm-bar-group-${index + 1}`);

                // add final stack value as readable text
                if (this.bmChartData.enable_end_of_bar_values) {
                    const key_available_series = Object.keys(this.bmChartData.data[key]);
                    const filtered_available_series = key_available_series
                        .filter((value) => {
                            return !this.bmChartData.filter_trinket_itemlevels.includes(value);
                        })
                        .map((value) => {
                            return Number.parseInt(value);
                        });
                    const highest_available_series_of_key = Math.max(...filtered_available_series);
                    console.log(
                        key_available_series,
                        filtered_available_series,
                        highest_available_series_of_key,
                        series
                    );
                    if (series === highest_available_series_of_key) {
                        const final_stack_value = BmUIUtils.createSpan(
                            'bm-bar-final-value',
                            this.bmChartData.convert_number_to_local(
                                this.bmChartData.get_value(key, series, this.bmChartData.value_calculation)
                            )
                        );
                        if (this.bmChartData.unit[this.bmChartData.value_calculation].length > 0) {
                            final_stack_value.appendChild(
                                BmUIUtils.createUnitTextNode(this.bmChartData.unit[this.bmChartData.value_calculation])
                            );
                        }
                        bar_part.appendChild(final_stack_value);
                    }
                }

                bar.appendChild(bar_part);
                // add more information for debugging
                // bar_part.dataset.end = previous_value;
                // bar_part.dataset.index = index;
                // bar_part.dataset.key = key;
                // bar_part.dataset.series = series;
                // bar_part.dataset.value = this.data[key][series];

                bar_part.addEventListener('click', (ev) => {
                    BmChartComponents.createVerticalLine(ev);
                });
            }
            // add grid template
            bar.style.gridTemplateColumns = [...steps, 'auto'].join('% ');
            // add tooltip
            // bootstrap
            // bar.dataset.toggle = "tooltip";
            // bar.dataset.placement = "left";
            // bar.dataset.html = "true";
            // bar.title = BmChartComponents.createTooltip(key);
            // bm-tooltips
            this.bmChartData.add_tooltip(
                bar,
                BmChartComponents.createTooltip(this.bmChartData, key, effective_series_index_names),
                'left'
            );

            row.appendChild(bar);
            root.appendChild(row);
        }
    }

    /**
     * Process and filter data keys
     * @returns {Array} Filtered and sorted data keys
     */
    processDataKeys() {
        return (
            this.bmChartData.sorted_data_keys
                .slice()
                // Remove "baseline"
                .filter((key) => key !== 'baseline')
                // Filter by data_source
                .filter((key) => {
                    if (this.bmChartData.loaded_data.hasOwnProperty('data_sources')) {
                        return !this.bmChartData.filter_trinket_sources.includes(
                            this.bmChartData.loaded_data['data_sources'][key]
                        );
                    }
                    return true;
                })
                // Filter active/passive trinkets
                .filter((key) => this.passesActivePassiveFilter(key))
                // Filter by no-remaining series
                .filter((key) => this.passesItemLevelFilter(key))
                // Sort by DPS value
                .sort((a, b) => this.compareDPSValues(a, b))
                // Limit results
                .slice(0, this.bmChartData.show_top > 0 ? this.bmChartData.show_top : undefined)
        );
    }

    // Helper methods for filtering and calculations (keeping existing logic)

    passesActivePassiveFilter(key) {
        if (
            this.bmChartData.data_type === 'trinkets' &&
            (this.bmChartData.filter_trinket_active_passive.includes('active') ||
                this.bmChartData.filter_trinket_active_passive.includes('Active'))
        ) {
            return this.bmChartData.loaded_data['data_active'][key] === false;
        }
        if (
            this.bmChartData.data_type === 'trinkets' &&
            (this.bmChartData.filter_trinket_active_passive.includes('passive') ||
                this.bmChartData.filter_trinket_active_passive.includes('Passive'))
        ) {
            return this.bmChartData.loaded_data['data_active'][key] === true;
        }
        return true;
    }

    passesItemLevelFilter(key) {
        if (this.bmChartData.data_type === 'trinkets') {
            for (const tmp_series of Object.keys(this.bmChartData.data[key])) {
                if (!this.bmChartData.filter_trinket_itemlevels.includes(Number.parseInt(tmp_series))) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    compareDPSValues(a, b) {
        const a_dps_object = structuredClone(this.bmChartData.data[a]);
        const b_dps_object = structuredClone(this.bmChartData.data[b]);

        // Remove filtered item levels
        for (const key of Object.keys(a_dps_object)) {
            if (this.bmChartData.filter_trinket_itemlevels.includes(Number.parseInt(key))) {
                delete a_dps_object[Number.parseInt(key)];
            }
        }
        for (const key of Object.keys(b_dps_object)) {
            if (this.bmChartData.filter_trinket_itemlevels.includes(Number.parseInt(key))) {
                delete b_dps_object[Number.parseInt(key)];
            }
        }

        let a_dps = Math.max(...Object.values(a_dps_object));
        let b_dps = Math.max(...Object.values(b_dps_object));

        if (Number.isInteger(a_dps_object) && Number.isInteger(b_dps_object)) {
            a_dps = a_dps_object;
            b_dps = b_dps_object;
        }

        // Special sorting for certain chart types
        if (['power_infusion', 'windfury_totem', 'trinket_compare'].includes(this.bmChartData.data_type)) {
            a_dps =
                this.bmChartData.data[a] - (this.bmChartData.base_values[a] || this.bmChartData.data['{' + a + '}']);
            b_dps =
                this.bmChartData.data[b] - (this.bmChartData.base_values[b] || this.bmChartData.data['{' + b + '}']);

            if (this.bmChartData.value_calculation === 'relative') {
                a_dps = a_dps / this.bmChartData.data[a];
                b_dps = b_dps / this.bmChartData.data[b];
            }
        }

        return b_dps - a_dps;
    }

    remove_vertical_line() {
        if (this.verticalLine !== undefined) {
            this.verticalLine.remove();
            this.verticalLine = undefined;
        }
    }
}

class BmRadarChart {
    /**
     * @type {BmChartData}
     */
    bmChartData;

    constructor(chart_data = new BmChartData()) {
        this.bmChartData = chart_data;

        this.bmChartData.clean_up_root();

        this.create_chart();

        try {
            $WowheadPower.refreshLinks();
        } catch (error) {
            console.error('Error occured while trying to refresh WowheadPower links.');
            console.error(error);
        }
        add_bm_tooltips_to_dom();
        BmUIUtils.addCSS(BmChartStyleId, BmChartStyleUrl);

        if (['bloodmallet.com', '127.0.0.1:8000'].includes(window.location.host)) {
            provide_meta_data(this.bmChartData, this.bmChartData.loaded_data);
        }
    }

    create_chart() {
        const size = 200;
        const zoom = 1 / 5;
        const c_h_m_v = this.bmChartData.sorted_data_data_keys[this.bmChartData.selected_data_key][0].split('_');
        const v_crit = parseInt(c_h_m_v[0]);
        const v_haste = parseInt(c_h_m_v[1]);
        const v_mastery = parseInt(c_h_m_v[2]);
        const v_vers = parseInt(c_h_m_v[3]);
        const dps =
            this.bmChartData.data[this.bmChartData.selected_data_key][
                this.bmChartData.sorted_data_data_keys[this.bmChartData.selected_data_key][0]
            ];

        const root = this.bmChartData.root_element;
        root.classList.add('bm-radar-root');

        root.appendChild(this.create_top());

        const stacked_overview_table = BmUIUtils.createDiv(null, [
            this.create_mini_radar_row(v_crit, v_haste, v_mastery, v_vers, dps, size, zoom, 0),
            this.create_mini_radar_row(70, 10, 10, 10, dps, size, zoom),
            this.create_mini_radar_row(10, 70, 10, 10, dps, size, zoom),
            this.create_mini_radar_row(10, 10, 70, 10, dps, size, zoom),
            this.create_mini_radar_row(10, 10, 10, 70, dps, size, zoom),
        ]);

        const table = BmUIUtils.createDiv('bm-radar-center', [
            this.create_distribution_table(v_crit, v_haste, v_mastery, v_vers, dps),
            this.create_main_radar(v_crit, v_haste, v_mastery, v_vers, dps, size),
            stacked_overview_table,
        ]);

        root.appendChild(table);
    }

    /**
     * Create the top section of the radar chart
     * @returns {HTMLElement}
     */
    create_top() {
        const top = BmUIUtils.createDiv('bm-radar-top');

        this.bmChartData.add_title(top);
        this.bmChartData.add_subtitle(top);
        this.bmChartData.add_simc_subtitle(top);

        return top;
    }

    create_distribution_table(crit, haste, mastery, vers, dps) {
        function add_row(description, ratio, rating, ingame) {
            function add_cell(text, suffix = undefined) {
                const element = BmUIUtils.createDiv('bm-stat-cell', text);
                if (suffix !== undefined) {
                    element.appendChild(BmUIUtils.createUnitTextNode(suffix));
                }
                return element;
            }

            const row = BmUIUtils.createDiv('bm-stat-row');

            const description_div = add_cell(description);
            description_div.classList.add('bm-stat-cell-stat');
            // row.appendChild(description_div);
            row.appendChild(add_cell(ratio, ' ' + description));
            // row.appendChild(add_cell(rating, " " + description));
            // row.appendChild(add_cell(ingame, "%"));
            // TODO: add rating as tooltip rounded to hundreds

            return row;
        }

        function get_rating(fraction, sum) {
            return Math.round((sum * fraction) / 100);
        }

        function get_ingame(fraction, sum, type) {
            // TODOS:
            // * stat start values
            // * stat start value changes based on talents...
            // * stat value conversion changes based on talents...
            // * diminishing return or stats...
            let value = -1;
            if (type !== 'Mastery') {
                // simple static conversion (maybe not due to special class multipliers?)
                const multipliers = {
                    'Critical Strike': 1 / 180,
                    Haste: 1 / 170,
                    Versatility: 1 / 205,
                };
                let base_value = -1;
                // get base value for each spec and stat
                base_value = 0;

                value = base_value + get_rating(fraction, sum) * multipliers[type];
            } else {
                value = 'TBD soon';
            }

            // TODO: apply diminishing returns
            return value;
        }

        // let stat = BmUIUtils.createDiv("bm-stat-cell", "Best Distribution");
        // let distribution = BmUIUtils.createDiv("bm-stat-cell", "Ratio");
        // let ingame_value = BmUIUtils.createDiv("bm-stat-cell", "Ingame");
        const best_ratio = BmUIUtils.createDiv('bm-stat-cell', [
            `Best Ratio: ${this.bmChartData.convert_number_to_local(dps, 0)}`,
            BmUIUtils.createUnitTextNode('dps'),
        ]);
        // let crit/haste/mastery/versatility

        const floater = BmUIUtils.createDiv(
            'bm-stat-floater',
            BmUIUtils.createDiv('bm-stat-header', [
                // stat,
                // distribution,
                best_ratio,
                // ingame_value,
                add_row(
                    'Critical Strike',
                    crit,
                    get_rating(crit, this.bmChartData.secondary_sum),
                    get_ingame(crit, this.bmChartData.secondary_sum, 'Critical Strike')
                ),
                add_row(
                    'Haste',
                    haste,
                    get_rating(haste, this.bmChartData.secondary_sum),
                    get_ingame(haste, this.bmChartData.secondary_sum, 'Haste')
                ),
                add_row(
                    'Mastery',
                    mastery,
                    get_rating(mastery, this.bmChartData.secondary_sum),
                    get_ingame(mastery, this.bmChartData.secondary_sum, 'Mastery')
                ),
                add_row(
                    'Versatility',
                    vers,
                    get_rating(vers, this.bmChartData.secondary_sum),
                    get_ingame(vers, this.bmChartData.secondary_sum, 'Versatility')
                ),
            ])
        );

        const table = BmUIUtils.createDiv('bm-stat-table', floater);

        return table;
    }

    create_mini_radar_row(crit, haste, mastery, vers, dps, size, zoom, dps_gain_mantissa = 1) {
        const cap = 70;
        const secondary_string = [crit, haste, mastery, vers].join('_');
        const abs_dps = this.bmChartData.data[this.bmChartData.selected_data_key][secondary_string];
        const rel_dps = this.bmChartData.get_relative_gain(abs_dps, dps) + 100.0;

        const svg_container = BmUIUtils.createDiv(
            '',
            this.create_radar_chart(crit, haste, mastery, vers, dps, false, false, size, zoom),
            {
                style: {
                    display: 'table-cell',
                },
            }
        );

        const row = BmUIUtils.createDiv('', svg_container, {
            style: {
                display: 'table-row',
            },
        });

        // add svg name as tooltip to capped value-rows
        if (secondary_string.indexOf(cap) !== -1) {
            let text = 'Critical Strike';
            if (haste === cap) {
                text = 'Haste';
            } else if (mastery === cap) {
                text = 'Mastery';
            } else if (vers === cap) {
                text = 'Versatility';
            }

            svg_container.setAttribute('data-bm-tooltip-text', text);
            svg_container.setAttribute('data-bm-tooltip-placement', 'left');
            svg_container.setAttribute('data-type', 'bm-tooltip');
        }

        const value = BmUIUtils.createDiv(
            'bm-radar-mini-table-value',
            this.bmChartData.convert_number_to_local(rel_dps, dps_gain_mantissa)
        );

        row.appendChild(value);

        value.appendChild(BmUIUtils.createUnitTextNode(this.bmChartData.unit['relative']));

        // add dps as tooltip
        const container = BmUIUtils.createDiv('', [
            this.bmChartData.convert_number_to_local(abs_dps, 0),
            BmUIUtils.createUnitTextNode('dps'),
        ]);

        value.setAttribute('data-bm-tooltip-text', container.outerHTML);
        value.setAttribute('data-bm-tooltip-placement', 'right');
        value.setAttribute('data-type', 'bm-tooltip');

        return row;
    }

    create_main_radar(crit, haste, mastery, vers, dps, size) {
        const radar = this.create_radar_chart(crit, haste, mastery, vers, dps, true, false, size);

        return BmUIUtils.createDiv('bm-radar-main-radar', radar);
    }

    /**
     * Create a radar chart.
     * @param {Number} crit
     * @param {Number} haste
     * @param {Number} mastery
     * @param {Number} vers
     * @param {Number} dps
     * @param {Boolean} show_legend
     * @param {Boolean} show_dps
     * @param {Number} size
     * @param {} size Float
     * @returns
     */
    create_radar_chart(crit, haste, mastery, vers, dps, show_legend, show_dps, size, zoom = 1.0) {
        const max_value = size / 2;
        const background_circles = [max_value * 0.6, max_value * 0.4, max_value * 0.2];
        const cross_max = (max_value / 5) * 4;
        const legend_space = max_value / 10;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        // svg.setAttribute("height", size * zoom);
        // svg.setAttribute("width", size * zoom);
        svg.style.minWidth = '45px';
        // svg.style.maxWidth = "100px";
        svg.style.maxWidth = '365px';
        svg.style.margin = 'auto';
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

        // background
        /// radar
        for (const r of background_circles) {
            const outer_circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            outer_circle.setAttribute('cx', size / 2);
            outer_circle.setAttribute('cy', size / 2);
            outer_circle.setAttribute('r', r);
            outer_circle.setAttribute('class', 'bm-radar-background');
            svg.appendChild(outer_circle);
        }
        /// cross
        const horizontal = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        horizontal.setAttribute('x1', size / 2 - cross_max);
        horizontal.setAttribute('y1', size / 2);
        horizontal.setAttribute('x2', size / 2 + cross_max);
        horizontal.setAttribute('y2', size / 2);
        horizontal.setAttribute('class', 'bm-radar-background');
        svg.appendChild(horizontal);

        const vertical = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vertical.setAttribute('x1', size / 2);
        vertical.setAttribute('y1', size / 2 - cross_max);
        vertical.setAttribute('x2', size / 2);
        vertical.setAttribute('y2', size / 2 + cross_max);
        vertical.setAttribute('class', 'bm-radar-background');
        svg.appendChild(vertical);

        /// legend
        if (show_legend === true) {
            const svg_crit = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            svg_crit.textContent = 'Critical Strike';
            svg_crit.setAttribute('x', size / 2);
            svg_crit.setAttribute('y', size / 2);
            svg_crit.setAttribute(
                'transform',
                `rotate(-90 ${size / 2},${size / 2}) translate(0 ${-(size / 2 - legend_space)})`
            );
            svg_crit.setAttribute('class', 'bm-radar-legend');
            svg_crit.setAttribute('dominant-baseline', 'central');
            svg.appendChild(svg_crit);

            const svg_haste = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            svg_haste.textContent = 'Haste';
            svg_haste.setAttribute('x', size / 2);
            svg_haste.setAttribute('y', size / 2);
            svg_haste.setAttribute('transform', `translate(0 ${-(size / 2 - legend_space)})`);
            svg_haste.setAttribute('class', 'bm-radar-legend');
            svg_haste.setAttribute('dominant-baseline', 'central');
            svg.appendChild(svg_haste);

            const svg_mastery = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            svg_mastery.textContent = 'Mastery';
            svg_mastery.setAttribute('x', size / 2);
            svg_mastery.setAttribute('y', size / 2);
            svg_mastery.setAttribute(
                'transform',
                `rotate(-90 ${size / 2},${size / 2}) translate(0 ${size / 2 - legend_space})`
            );
            svg_mastery.setAttribute('class', 'bm-radar-legend');
            svg_mastery.setAttribute('dominant-baseline', 'central');
            svg.appendChild(svg_mastery);

            const svg_vers = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            svg_vers.textContent = 'Versatility';
            svg_vers.setAttribute('x', size / 2);
            svg_vers.setAttribute('y', size / 2);
            svg_vers.setAttribute('transform', `translate(0 ${size / 2 - legend_space})`);
            svg_vers.setAttribute('class', 'bm-radar-legend');
            svg_vers.setAttribute('dominant-baseline', 'central');
            svg.appendChild(svg_vers);
        }

        // foreground
        /// object
        const object = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        object.setAttribute(
            'points',
            `${(size / 2) * (1 - crit / 100)},${size / 2} ${size / 2},${(size / 2) * (1 - haste / 100)} ${(size / 2) * (1 + mastery / 100)},${size / 2} ${size / 2},${(size / 2) * (1 + vers / 100)}`
        );
        object.setAttribute('class', 'bm-radar-object');
        svg.appendChild(object);

        /// text
        if (show_dps === true) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = dps.toLocaleString();
            text.setAttribute('x', size / 2);
            text.setAttribute('y', size / 2);
            text.setAttribute('class', 'bm-radar-object-value');
            text.setAttribute('dominant-baseline', 'central');
            svg.appendChild(text);
        }

        return svg;
    }
}

async function bm_import_charts() {
    console.debug('bm_import_charts called');
    // find bloodmallet_chart class elements
    const chart_anchors = document.querySelectorAll('div.bloodmallet_chart');
    // console.log(chart_anchors);
    const domain = 'bloodmallet.com';
    const local = '127.0.0.1:8000';
    const endpoint = `https://${domain}/chart/get`;

    for (const chart_anchor of chart_anchors) {
        // set language if language information is missing from chart and language cookie was set
        if (
            !chart_anchor.dataset.language &&
            (location.hostname == domain || location.hostname == local) &&
            ('; ' + document.cookie).indexOf('; django_language=') > -1
        ) {
            // https://stackoverflow.com/a/59603055/8002464
            const language = ('; ' + document.cookie).split(`; django_language=`).pop().split(';')[0];
            chart_anchor.dataset.language = language;
        }

        if (chart_anchor.dataset.loadedData) {
            // create BmChartData from element
            try {
                const bm_data = new BmChartData(chart_anchor);
                // get chart type from loaded data
                let chart = BmBarChart;
                if (bm_data.data_type === 'secondary_distributions') {
                    // create Chart based on chart type
                    chart = BmRadarChart;
                }

                new chart(bm_data);
                continue;
            } catch (error) {
                console.error(`Error creating chart:`, error);
            }
        }

        let request_endpoint = undefined;
        let chart_type;
        let fight_style;
        let item_name;
        let item_level;

        if (chart_anchor.dataset.hasOwnProperty('chartId')) {
            console.debug(`Chart has chartId:`, chart_anchor.dataset.chartId);
            // if chart_id -> load id
            const chart_id = chart_anchor.dataset?.chartId;
            // console.log("Identified chart id:", chart_id);
            request_endpoint = endpoint + '/' + chart_id;
        } else if (
            'wowClass' in chart_anchor.dataset &&
            'wowSpec' in chart_anchor.dataset &&
            chart_anchor.dataset.wowClass &&
            chart_anchor.dataset.wowSpec
        ) {
            const wow_class = chart_anchor.dataset.wowClass;
            const wow_spec = chart_anchor.dataset.wowSpec;
            chart_type = chart_anchor.dataset.type || 'trinkets';
            fight_style = chart_anchor.dataset.fightStyle || 'castingpatchwerk';

            // console.log("Identified chart_import for standard", chart_type, "chart of fight_style", fight_style, "for", wow_spec, wow_class);
            request_endpoint = [endpoint, chart_type, fight_style, wow_class, wow_spec].join('/');
        } else if ('type' in chart_anchor.dataset && chart_anchor.dataset.type === 'trinket_compare') {
            // Handle trinket_compare
            item_name = chart_anchor.dataset.itemName;
            item_level = chart_anchor.dataset.itemLevel;
            chart_type = chart_anchor.dataset.type;
            fight_style = chart_anchor.dataset.fightStyle || 'castingpatchwerk';
            request_endpoint = [endpoint, chart_type, fight_style, item_name, item_level].join('/');
        }
        // console.log("bloodmallet.com: loading chart from", request_endpoint);
        try {
            let data;
            if (chart_type === 'trinket_compare') {
                data = await getTrinketDataAsync(item_name, item_level, fight_style);
            } else {
                const response = await fetch(request_endpoint);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
            }

            chart_anchor.dataset.loadedData = JSON.stringify(data);
            const bm_data = new BmChartData(chart_anchor);

            let chart;
            switch (bm_data.data_type) {
                case 'secondary_distributions':
                    chart = BmRadarChart;
                    break;
                case 'power_infusion':
                case 'trinket_compare':
                default:
                    chart = BmBarChart;
            }

            new chart(bm_data);
        } catch (error) {
            console.error('Error fetching or processing data:', error);
        }
    }
}

async function updateTrinketChartAsync(state) {
    const charts = document.querySelectorAll('div.bloodmallet_chart');
    const chart_anchor = charts[0];

    try {
        const data = await getTrinketDataAsync(state.item_name, state.item_level, state.fight_style);

        chart_anchor.dataset.loadedData = JSON.stringify(data);
        const bm_data = new BmChartData(chart_anchor);
        new BmBarChart(bm_data);
    } catch (error) {
        console.error('Error updating trinket chart:', error);
    }
}

window.updateTrinketChartAsync = updateTrinketChartAsync;

// Load data on document load
document.addEventListener('DOMContentLoaded', function () {
    bm_import_charts();
});

/**
 * Utility class for BloodMallet UI operations
 * Contains helper methods for DOM manipulation and formatting
 */
class BmUIUtils {
    /**
     * Get Wowhead subdomain for a language
     *
     * @param {string} language - Language code (e.g., "en_US")
     * @returns {string} Wowhead subdomain
     */
    static getWowheadSubdomain(language) {
        const subdomains = {
            en_US: 'www',
            cn_CN: 'cn',
            de_DE: 'de',
            es_ES: 'es',
            fr_FR: 'fr',
            it_IT: 'it',
            ko_KR: 'ko',
            pt_BR: 'pt',
            ru_RU: 'ru',
        };

        return subdomains[language] || 'www';
    }

    /**
     * Get language from Django cookie
     * @returns {string|null} Language code or null if not found
     */
    static getLanguageFromCookie() {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const trimmedCookie = cookie.trim();
            if (trimmedCookie.startsWith('django_language=')) {
                return trimmedCookie.split('=')[1];
            }
        }
        return null;
    }

    /**
     * Get language from dataset attribute
     * @param {HTMLElement} element The element to check for language attribute
     * @returns {string|null} Language code or null if not found
     */
    static getLanguageFromDataset(element) {
        return element?.dataset?.language || null;
    }

    /**
     * Get language from browser settings
     * @returns {string|null} Language code or null if not found
     */
    static getLanguageFromBrowser() {
        return navigator.language ? navigator.language.split('-')[0] : null;
    }

    /**
     * Convert language code to full form if needed
     * @param {string} langCode The language code to convert
     * @returns {string} The full language code
     */
    static normalizeLanguageCode(langCode) {
        /**
         * Language mapping from short to long form
         */
        const languageMap = {
            cn: 'cn_CN',
            en: 'en_US',
            de: 'de_DE',
            es: 'es_ES',
            fr: 'fr_FR',
            it: 'it_IT',
            ko: 'ko_KR',
            pt: 'pt_BR',
            ru: 'ru_RU',
            'zh-hans': 'cn_CN',
        };

        return languageMap[langCode] || langCode;
    }

    /**
     * Detects the user's language from element, cookies or browser settings
     * @param {HTMLElement} element Optional element to check for language attribute
     * @returns {string} The full language code (e.g., "en_US")
     */
    static detectUserLanguage(element = null) {
        const langCode =
            this.getLanguageFromDataset(element) || this.getLanguageFromCookie() || this.getLanguageFromBrowser();
        return this.normalizeLanguageCode(langCode || 'en_US');
    }

    /**
     * Format types for text processing
     * @readonly
     * @enum {string}
     */
    static FormatTypes = Object.freeze({
        SLUG: 'slug',
        ITEM_LEVEL: 'item_level',
        FIGHT_STYLE: 'fight_style',
        ITEM_NAME: 'item_name',
    });

    /**
     * Formats text based on the specified type
     * @param {string} text The text to format
     * @param {FormatTypes} type The type of formatting to apply (e.g., "SLUG", "FIGHT_STYLE")
     * @returns {string} The formatted text
     */
    static formatText(text, type) {
        if (!text) return 'Loading...';

        const fightStyles = {
            castingpatchwerk: 'Casting Patchwerk 1 target',
            castingpatchwerk3: 'Casting Patchwerk 3 targets',
            castingpatchwerk5: 'Casting Patchwerk 5 targets',
        };

        switch (type) {
            case this.FormatTypes.SLUG:
                return text.replaceAll(' ', '_').toLowerCase();
            case this.FormatTypes.ITEM_LEVEL:
                return text;
            case this.FormatTypes.FIGHT_STYLE:
                return fightStyles[text] || text;
            case this.FormatTypes.ITEM_NAME:
                return text
                    .split('_')
                    .map((w) => w[0].toUpperCase() + w.slice(1))
                    .join(' ');
            default:
                return text;
        }
    }

    /**
     * Format a number for display with proper locale formatting
     *
     * @param {number} value - The number to format
     * @param {number} mantissa - Number of decimal places (default: 2)
     * @returns {string} Formatted number string
     */
    static formatNumber(value, mantissa = 2) {
        const roundedValue = Math.round((value + Number.EPSILON) * 10 ** mantissa) / 10 ** mantissa;
        return roundedValue.toLocaleString(undefined, {
            minimumFractionDigits: mantissa,
            maximumFractionDigits: mantissa,
        });
    }

    /**
     * Capitalizes all first letters in a string, preserving underscores
     * Example: string_test -> String_Test
     * @param {string} string The string to capitalize
     * @returns {string} The capitalized string
     */
    static capitalizeFirstLetters = (string) => {
        if (!string) return '';

        let newString = string.charAt(0).toUpperCase();
        if (string.includes('_')) {
            newString += string.slice(1, string.indexOf('_') + 1);
            newString += this.capitalizeFirstLetters(string.slice(string.indexOf('_') + 1));
        } else {
            newString += string.slice(1);
        }
        return newString;
    };

    /**
     * Safely parse JSON with error handling
     *
     * @param {string} jsonString - JSON string to parse
     * @param {*} defaultValue - Default value to return if parsing fails
     * @returns {Object} Parsed object or default value
     */
    static safeJsonParse(jsonString, defaultValue = null) {
        if (!jsonString) return defaultValue;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return defaultValue;
        }
    }

    /**
     * Get chart data from a chart element
     * @param {HTMLElement} chart - Chart element
     * @returns {Object|null} Chart data or null if not available
     */
    static getChartData(chart) {
        if (!chart || !chart.dataset.loadedData) return null;
        return this.safeJsonParse(chart.dataset.loadedData);
    }

    /**
     * Inject CSS into the head of the document
     *
     * @param {string} id - ID for the style element
     * @param {string} url - URL to the CSS file
     */
    static addCSS(id, url) {
        if (document.getElementById(id)) {
            return;
        }

        const styles = document.createElement('link');
        styles.id = id;
        styles.rel = 'stylesheet';
        styles.type = 'text/css';
        styles.href = url + '?now=' + Date.now();
        styles.media = 'all';
        document.getElementsByTagName('head')[0].appendChild(styles);
    }

    /**
     * Creates a unit text node with the appropriate styling
     * @param {string} unit The unit to display (e.g., "%")
     * @returns {HTMLSpanElement} A span element containing the unit
     */
    static createUnitTextNode(unit) {
        return BmUIUtils.createSpan('bm-unit', unit);
    }

    /**
     * Creates a DOM element with specified attributes and children
     *
     * This method intelligently handles different types of element properties:
     * - Standard DOM properties (className, innerText, etc.) are set directly as properties
     * - Custom attributes (data-*, aria-*, etc.) are set using setAttribute()
     * - Event handlers are registered using addEventListener()
     * - Style objects are merged with existing styles
     * - Dataset objects are merged with existing dataset properties
     *
     * @param {string} tag - The HTML tag name (e.g., 'div', 'span', 'button')
     * @param {Object} attributes - Element configuration object with the following supported properties:
     *   @param {Object} attributes.events - Event handlers as { eventName: handlerFunction } pairs
     *   @param {Object} attributes.style - CSS styles as { property: value } pairs (merged with existing styles)
     *   @param {Object} attributes.dataset - Data attributes as { key: value } pairs (merged with existing dataset)
     *   @param {string} attributes.className - CSS class names (space-separated string)
     *   @param {string} attributes.innerText - Text content of the element
     *   @param {string} attributes.innerHTML - HTML content of the element
     *   @param {string} attributes.id - Element ID
     *   @param {string} attributes.yourCustomAttribute - Any other property/attribute
     * @param {Array<string|HTMLElement>|string|HTMLElement} children - Child elements or content:
     *   - Array: Multiple mixed strings or HTMLElements (strings are converted to text nodes)
     *   - String/Number/Boolean: Single text content (converted to text node)
     *   - HTMLElement: Single DOM element
     *   - null/undefined: Ignored
     * @returns {HTMLElement} The created and configured DOM element
     *
     * @example
     * // Create a button with click handler and styling
     * const button = createElement('button', {
     *   className: 'btn btn-primary',
     *   innerText: 'Click me',
     *   events: { click: () => alert('Clicked!') },
     *   style: { marginTop: '10px' },
     *   dataset: { action: 'submit' }
     * });
     *
     * @example
     * // Create a div with multiple children
     * const container = createElement('div', { className: 'container' }, [
     *   'Hello ',
     *   createElement('strong', {}, 'World'),
     *   '!'
     * ]);
     */
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);

        // Ensure attributes is always an object
        const safeAttributes =
            attributes && typeof attributes === 'object' && !Array.isArray(attributes) ? attributes : {};

        // Handle special cases, everything else gets set directly
        const { events, style, dataset, ...options } = safeAttributes;

        if (events) {
            Object.entries(events).forEach(([event, handler]) => element.addEventListener(event, handler));
        }

        if (style) {
            Object.assign(element.style, style);
        }

        if (dataset) {
            Object.assign(element.dataset, dataset);
        }

        // Set all other attributes/properties - className, innerText, etc.)
        Object.entries(options).forEach(([key, value]) => {
            if (key in element) {
                element[key] = value; // Set standard DOM Properties
            } else {
                element.setAttribute(key, value); // Set custom attributes
            }
        });

        // Handle children - normalize to array
        const childArray = Array.isArray(children) ? children : [children];

        childArray.forEach((child) => {
            if (child instanceof Node) {
                element.appendChild(child);
            } else if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
                // Handle primitives that make sense as text
                element.appendChild(document.createTextNode(String(child)));
            } else if (child !== null && child !== undefined) {
                // Log warning for unexpected types
                console.warn('Unexpected child type in createElement:', typeof child, child);
                element.appendChild(document.createTextNode(String(child)));
            }
        });

        return element;
    }

    /**
     * Creates a div element with CSS classes and optional children - a convenient wrapper around createElement
     *
     * This is a specialized version of createElement optimized for the common case of creating div elements
     * with CSS classes. It handles class name normalization and provides a clean API for the most common
     * div creation scenarios.
     *
     * @param {string|Array<string>} classNames - CSS class names to apply to the div:
     *   - String: Space-separated class names (e.g., 'container fluid')
     *   - Array: Array of class names (e.g., ['container', 'fluid'])
     *   - Empty string or falsy: No classes applied
     * @param {Array<string|HTMLElement>|string|HTMLElement} children - Child elements or content:
     *   - Array: Multiple mixed strings or HTMLElements (strings are converted to text nodes)
     *   - String/Number/Boolean: Single text content (converted to text node)
     *   - HTMLElement: Single DOM element
     *   - null/undefined: Ignored
     * @param {Object} attributes - Element configuration object with the following supported properties:
     *   @param {Object} attributes.events - Event handlers as { eventName: handlerFunction } pairs
     *   @param {Object} attributes.style - CSS styles as { property: value } pairs (merged with existing styles)
     *   @param {Object} attributes.dataset - Data attributes as { key: value } pairs (merged with existing dataset)
     *   @param {string} attributes.innerText - Text content of the element
     *   @param {string} attributes.innerHTML - HTML content of the element
     *   @param {string} attributes.id - Element ID
     *   @param {string} attributes.yourCustomAttribute - Any other property/attribute
     * @returns {HTMLElement} A div element with the specified classes, children, and attributes
     *
     * @example
     * // Create a simple div with classes
     * const container = createDiv('container fluid');
     *
     * @example
     * // Create a div with classes and text content
     * const wrapper = createDiv(['wrapper', 'highlight'], 'Hello World');
     *
     * @example
     * // Create a div with classes, children, and additional attributes
     * const section = createDiv('section', [
     *   createElement('h2', {}, 'Title'),
     *   createDiv('container', createElement('p', null, 'Hello!'), {id: 'ContentDiv'}),
     * ], {
     *   id: 'main-section',
     *   'data-section': 'primary'
     * });
     */
    static createDiv(classNames = '', children = [], attributes = {}) {
        const options = {};

        // Only add className if provided and not empty
        if (classNames && (typeof classNames === 'string' || Array.isArray(classNames)) && classNames.trim()) {
            const className = Array.isArray(classNames) ? classNames.join(' ') : classNames;
            options.className = className;
        }

        // Merge any additional attributes as long as attributes is actually an object
        if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
            Object.assign(options, attributes);
        }

        return this.createElement('div', options, children || []);
    }

    /**
     * Creates a span element with specified classes and children
     * @param {string|Array<string>} classNames - CSS class names
     * @param {Array|string|HTMLElement} children - Element children
     * @returns {HTMLElement} The created span element
     */
    static createSpan(classNames = '', children = []) {
        const className = Array.isArray(classNames) ? classNames.join(' ') : classNames;
        return this.createElement('span', { className }, children);
    }

    /**
     * Source: https://stackoverflow.com/a/35385518
     * @param {String} HTML representing a single element
     * @return {Element}
     */
    static htmlToElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();

        return template.content.firstChild;
    }

    /**
     * Convert attribute input to class name.
     * @param {string} placement user input from the element attribute
     * @returns string
     */
    static getTooltipPlacementClass(placement) {
        if (!placement) {
            return BmTooltipClass.BOTTOM;
        }

        switch (placement) {
            case 'top':
                return BmTooltipClass.TOP;
            case 'bottom':
                return BmTooltipClass.BOTTOM;
            case 'left':
                return BmTooltipClass.LEFT;
            case 'right':
                return BmTooltipClass.RIGHT;
            default:
                console.warn(`Unknown placement '${placement}'. Falling back to 'bottom'.`);
                return BmTooltipClass.BOTTOM;
        }
    }

    /**
     *
     * @param {Element} element
     * @param {Element} tooltip
     * @param {String} placement
     * @returns Coordinate
     */
    static getTooltipPosition(element, tooltip, placement) {
        const elementBox = element.getBoundingClientRect();
        const tooltipBox = tooltip.getBoundingClientRect();

        switch (placement) {
            case BmTooltipClass.TOP:
                return {
                    x: elementBox.x + elementBox.width / 2 - tooltipBox.width / 2,
                    y: elementBox.y - tooltipBox.height,
                };
            case BmTooltipClass.BOTTOM:
                return {
                    x: elementBox.x + elementBox.width / 2 - tooltipBox.width / 2,
                    y: elementBox.y + elementBox.height,
                };
            case BmTooltipClass.LEFT:
                return {
                    x: elementBox.x - tooltipBox.width,
                    y: elementBox.y + elementBox.height / 2 - tooltipBox.height / 2,
                };
            case BmTooltipClass.RIGHT:
                return {
                    x: elementBox.x + elementBox.width,
                    y: elementBox.y + elementBox.height / 2 - tooltipBox.height / 2,
                };
            default:
                return {
                    x: elementBox.x,
                    y: elementBox.y + elementBox.height,
                };
        }
    }
}

class BmChartComponents {
    /**
     * Create a legend for the chart
     *
     * @param {BmChartData} chartData - Chart data and configuration
     * @param {Array<[Number, String]>} series_index_names - Series data with indices
     * @returns {HTMLElement} Legend element
     */
    static createLegend(chartData, series_index_names) {
        if (!chartData.enable_legend) {
            return null;
        }

        const legendItems = [];
        for (let [index, series] of series_index_names) {
            legendItems.push(
                BmUIUtils.createDiv(`bm-legend-item bm-bar-group-${index + 1}`, series),
                ' ' // Space between items
            );
        }

        return BmUIUtils.createDiv('bm-legend', [
            BmUIUtils.createDiv('bm-legend-title', chartData.legend_title),
            BmUIUtils.createDiv('bm-legend-items', legendItems),
        ]);
    }

    /**
     * Creates a vertical line to more easily compare values.
     * In case a line exists, the old line is removed.
     * In case the same element was clicked for the second time, the old line is removed.
     * @param {BmChartData} bmChartData - Chart data object
     * @param {Event} event click event
     */
    static createVerticalLine(bmChartData, event) {
        let verticalLineBox = undefined;
        if (this.verticalLine !== undefined) {
            verticalLineBox = this.verticalLine.getBoundingClientRect();
            this.removeVerticalLine();
        }

        const root = bmChartData.root_element;
        const parentBox = root.getBoundingClientRect();
        const eventBox = event.target.getBoundingClientRect();
        const left = eventBox.right + window.scrollX;

        const line = BmUIUtils.createDiv('', null, {
            style: {
                position: 'absolute',
                width: '0px',
                border: '1px solid white',
                height: `${parentBox.height}px`,
                left: `${left}px`,
            },
        });

        root.appendChild(line);
        this.verticalLine = line;

        // Remove line if user clicked on the same element twice
        const lineBox = line.getBoundingClientRect();
        if (verticalLineBox !== undefined && verticalLineBox.x == lineBox.x) {
            this.removeVerticalLine();
        }
    }

    /**
     * Remove the vertical comparison line
     */
    static removeVerticalLine() {
        if (this.verticalLine !== undefined) {
            this.verticalLine.remove();
            this.verticalLine = undefined;
        }
    }

    /**
     * Create the string representation of a html structured tooltip.
     * @param {BmChartData} bmChartData - Chart data object
     * @param {String} key - Data key
     * @param {Array<[Number, String]>} indexedSeries - Series data with indices
     * @returns {String} HTML string for tooltip
     */
    static createTooltip(bmChartData, key, indexedSeries) {
        // use own local copy
        indexedSeries = indexedSeries.slice();

        const translated_name = bmChartData.get_translated_name(key);
        const rows = [];

        // Add title
        rows.push(BmUIUtils.createDiv('bm-tooltip-title', translated_name));

        // Add series data (inverse sort to have the table start with the highest value)
        for (const [index, series] of indexedSeries.reverse()) {
            if (!bmChartData.data[key].hasOwnProperty(series)) {
                // data doesn't have series element, skipping
                continue;
            }

            const mantissa = bmChartData.value_calculation === 'total' ? 0 : 2;
            const value = bmChartData.convert_number_to_local(
                bmChartData.get_value(key, series, bmChartData.value_calculation),
                mantissa
            );

            const unit = bmChartData.unit[bmChartData.value_calculation];
            const valueContent = [];

            // Add unit in proper position
            if (bmChartData.value_calculation === 'absolute' && unit.length > 0) {
                valueContent.push(BmUIUtils.createUnitTextNode(unit));
            }

            valueContent.push(value);

            if (bmChartData.value_calculation === 'relative' && unit.length > 0) {
                valueContent.push(BmUIUtils.createUnitTextNode(unit));
            }

            rows.push(
                BmUIUtils.createDiv('bm-tooltip-row', [
                    BmUIUtils.createDiv(`bm-tooltip-key bm-bar-group-${index + 1}`, series),
                    BmUIUtils.createDiv('bm-tooltip-value', valueContent),
                ])
            );
        }

        // Handle chart types without multiple series
        if (bmChartData.data_type === 'races') {
            const value = bmChartData.convert_number_to_local(bmChartData.data[key]);
            const unit = bmChartData.unit[bmChartData.value_calculation];
            const valueContent = [value];

            // Add unit if applicable
            if (unit.length > 0) {
                valueContent.push(BmUIUtils.createUnitTextNode(unit));
            }

            rows.push(
                BmUIUtils.createDiv('bm-tooltip-row', [
                    BmUIUtils.createDiv('bm-tooltip-key bm-bar-group-1', key),
                    BmUIUtils.createDiv('bm-tooltip-value', valueContent),
                ])
            );
        } else if (['power_infusion', 'windfury_totem', 'trinket_compare'].indexOf(bmChartData.data_type) > -1) {
            const abbreviation = {
                power_infusion: 'PI',
                windfury_totem: 'WFT',
                trinket_compare: 'Trinket',
            };

            const base_value = bmChartData.base_values[key] || bmChartData.data['{' + key + '}'];
            let value;

            if (bmChartData.value_calculation === 'relative') {
                value = bmChartData.convert_number_to_local(
                    ((bmChartData.data[key] - base_value) * 100) / bmChartData.data[key]
                );
            } else {
                value = bmChartData.convert_number_to_local(bmChartData.data[key] - base_value);
            }

            const unit = bmChartData.unit[bmChartData.value_calculation];
            const valueContent = [value];

            // Add unit if applicable
            if (unit.length > 0) {
                valueContent.push(BmUIUtils.createUnitTextNode(unit));
            }

            rows.push(
                BmUIUtils.createDiv('bm-tooltip-row', [
                    BmUIUtils.createDiv(
                        'bm-tooltip-key bm-bar-group-1',
                        document.createTextNode(abbreviation[bmChartData.data_type])
                    ),
                    BmUIUtils.createDiv('bm-tooltip-value', valueContent),
                ])
            );
        }

        // Add legend
        rows.push(
            BmUIUtils.createDiv('bm-tooltip-row', [
                BmUIUtils.createDiv('bm-tooltip-key-title bm-tooltip-width-marker-top', bmChartData.legend_title),
                BmUIUtils.createDiv('bm-tooltip-value-title bm-tooltip-width-marker-top', bmChartData.x_axis_title),
            ])
        );

        const container = BmUIUtils.createDiv('bm-tooltip-container', rows);
        return container.outerHTML;
    }

    /**
     * Create axis titles section for bar charts
     * @param {BmChartData} bmChartData - Chart data
     * @returns {HTMLElement} Axis titles element
     */
    static createAxisTitles(bmChartData) {
        // Create min value
        const minContent = [];
        if (['absolute', 'relative'].indexOf(bmChartData.value_calculation) > -1) {
            const unitTextNode = BmUIUtils.createUnitTextNode(bmChartData.unit[bmChartData.value_calculation]);

            if (bmChartData.value_calculation === 'absolute') {
                minContent.push(unitTextNode, 0);
            } else if (bmChartData.value_calculation === 'relative') {
                minContent.push(0, unitTextNode);
            }
        } else {
            minContent.push(0);
        }

        // Create max value
        const maxContent = [];
        if (['absolute', 'relative'].includes(bmChartData.value_calculation)) {
            const unitTextNode = BmUIUtils.createUnitTextNode(bmChartData.unit[bmChartData.value_calculation]);
            const baseValue = bmChartData.base_values[bmChartData.series_names[bmChartData.series_names.length - 1]];

            if (bmChartData.value_calculation === 'absolute') {
                maxContent.push(unitTextNode);
                if (['power_infusion', 'windfury_totem', 'trinket_compare'].includes(bmChartData.data_type)) {
                    maxContent.push(bmChartData.convert_number_to_local(bmChartData.global_max_value));
                } else {
                    maxContent.push(
                        bmChartData.convert_number_to_local(
                            bmChartData.get_absolute_gain(bmChartData.global_max_value, baseValue)
                        )
                    );
                }
            } else if (bmChartData.value_calculation === 'relative') {
                const relativeGain = this.calculateRelativeGain(bmChartData, baseValue);
                maxContent.push(bmChartData.convert_number_to_local(relativeGain), unitTextNode);
            }
        } else {
            maxContent.push(bmChartData.convert_number_to_local(bmChartData.global_max_value, 0));
        }

        return BmUIUtils.createDiv('bm-axis bm-row', [
            BmUIUtils.createDiv('bm-key-title'),
            BmUIUtils.createDiv('bm-bar-title', [
                BmUIUtils.createSpan('bm-bar-min', minContent),
                bmChartData.x_axis_title,
                BmUIUtils.createSpan('bm-bar-max', maxContent),
            ]),
        ]);
    }

    /**
     * Helper method to calculate relative gain for different chart types
     * @param {BmChartData} bmChartData - Chart data
     * @param {Number} baseValue - Base value for calculation
     * @returns {Number} Calculated relative gain
     */
    static calculateRelativeGain(bmChartData, baseValue) {
        if (bmChartData.wow_class === 'evoker' && bmChartData.wow_spec === 'augmentation') {
            const augBaseValue = bmChartData.loaded_data['profile']['metadata']['base_dps'];
            const rawGain = bmChartData.get_absolute_gain(bmChartData.global_max_value, baseValue);
            // console.log("augmentation had a raw gain of", raw_gain, "dps compared to its own max dps of", aug_base_value);
            return bmChartData.get_relative_gain(augBaseValue + rawGain, augBaseValue);
        } else {
            if (['power_infusion', 'windfury_totem', 'trinket_compare'].indexOf(bmChartData.data_type) > -1) {
                return bmChartData.global_max_value;
            } else {
                return bmChartData.get_relative_gain(bmChartData.global_max_value, baseValue);
            }
        }
    }
}

// Export utils for use in other modules
window.BmUIUtils = BmUIUtils;
window.BmChartComponents = BmChartComponents;
