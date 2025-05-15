/**
 * BloodMallet.com chart system - Main charting component
 * 
 * This file contains the chart generation system for bloodmallet.com
 * - BmBarChart: Main bar chart display component
 * - BmRadarChart: Secondary stats radar chart display component
 * - BmChartData: Data and configuration extraction component
 */

const BmChartStyleId = "bm-chart-styles";
const BmChartStyleUrl = "/static/general_website/css/bm-charts.css";
const BmTooltipJsId = "bm-tooltip-javascript";
const BmTooltipJsUrl = "/static/general_website/js/bm-tooltips.js";

let trinketDataCache = {};
const TRINKET_DATA_CACHE_KEY = 'trinketData';
const TRINKET_DATA_CACHE_EXPIRY = 30 * 60 * 1000;  // 30 minutes in milliseconds

/**
 * Check if trinket data cache is still valid
 * @returns {boolean} True if cache is valid
 */
const isTrinketDataCacheValid = () => {
    const timestamp = localStorage.getItem(TRINKET_DATA_CACHE_KEY + '_timestamp');
    return timestamp && (Date.now() - parseInt(timestamp, 10)) < TRINKET_DATA_CACHE_EXPIRY;
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
        firstItemKey = Object.keys(data.items).find(key => key !== "baseline");
        itemData = data.items[itemName] || data.items[firstItemKey];

        // Use provided itemLevel or get highest available
        const availableLevels = Object.keys(itemData.itemLevels)
            .map(level => parseInt(level))
            .sort((a, b) => b - a); // Sort descending


        const firstItemLevelKey = availableLevels[0].toString();
        const { sorted_data_keys, ...itemLevelData } = itemData.itemLevels[itemLevel] || itemData.itemLevels[firstItemLevelKey];

        return {
            data: {
                ...itemLevelData,
                baseline: itemData.baseline,
            },
            data_type: "trinket_compare",
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
        console.error("Error in getTrinketDataAsync:", error);
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
        ["death_knight", "blood", "Blood Death Knight"],
        ["death_knight", "frost", "Frost Death Knight"],
        ["death_knight", "unholy", "Unholy Death Knight"],
        ["demon_hunter", "havoc", "Havoc Demon Hunter"],
        ["demon_hunter", "vengeance", "Vengeance Demon Hunter"],
        ["druid", "balance", "Balance Druid"],
        ["druid", "feral", "Feral Druid"],
        ["druid", "guardian", "Guardian Druid"],
        // ["evoker", "augmentation", "Augmentation Evoker"],
        ["evoker", "devastation", "Devastation Evoker"],
        ["hunter", "beast_mastery", "Beast Mastery Hunter"],
        ["hunter", "marksmanship", "Marksmanship Hunter"],
        ["hunter", "survival", "Survival Hunter"],
        ["mage", "arcane", "Arcane Mage"],
        ["mage", "fire", "Fire Mage"],
        ["mage", "frost", "Frost Mage"],
        ["monk", "brewmaster", "Brewmaster Monk"],
        ["monk", "windwalker", "Windwalker Monk"],
        ["paladin", "protection", "Protection Paladin"],
        ["paladin", "retribution", "Retribution Paladin"],
        ["priest", "shadow", "Shadow Priest"],
        ["rogue", "assassination", "Assassination Rogue"],
        ["rogue", "outlaw", "Outlaw Rogue"],
        ["rogue", "subtlety", "Subtlety Rogue"],
        ["shaman", "elemental", "Elemental Shaman"],
        ["shaman", "enhancement", "Enhancement Shaman"],
        ["warlock", "affliction", "Affliction Warlock"],
        ["warlock", "demonology", "Demonology Warlock"],
        ["warlock", "destruction", "Destruction Warlock"],
        ["warrior", "arms", "Arms Warrior"],
        ["warrior", "fury", "Fury Warrior"],
        ["warrior", "protection", "Protection Warrior"],
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
        timestamp: null
    };

    Object.entries(data).forEach(([className, entry]) => {
        if (entry.status === "error") {
            return;
        }

        // Process the trinket data
        Object.entries(entry.data).forEach(([itemName, itemLevels]) => {
            const itemKey = itemName.toLowerCase().replace(/ /g, "_");
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
        timestamp: data.timestamp
    };

    for (const itemName in data.items) {
        sortedData.items[itemName] = {
            itemLevels: {},
            translations: data.items[itemName].translations,
            baseline: data.items[itemName].baseline
        };
        for (const itemLevel in data.items[itemName].itemLevels) {
            const sortedSpecs = Object.entries(data.items[itemName].itemLevels[itemLevel])
                .sort((a, b) => b[1] - a[1]);
            sortedData.items[itemName].itemLevels[itemLevel] = Object.fromEntries(sortedSpecs);
            sortedData.items[itemName].itemLevels[itemLevel].sorted_data_keys = Object.keys(Object.fromEntries(sortedSpecs));
        }
    }
    return sortedData;
};

/**
 * Add bloodmallet tooltip js to page and execute `bm_register_tooltips`.
 */
function add_bm_tooltips_to_dom() {
    BmUIUtils.addCSS(BmTooltipJsId, BmTooltipJsUrl);

    try {
        bm_register_tooltips();
    } catch (e) {
        let script = document.getElementById(BmTooltipJsId);
        script.addEventListener("load", () => {
            bm_register_tooltips();
        });
        script.addEventListener("error", (error) => {
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
    title = "";
    /**
     * e.g. Datetime of creation, simc-hash
     */
    subtitle = "";
    /**
     * SimulationCraft hash, e.g. 567hj0
     */
    simc_hash = "";
    /**
     * e.g. Itemlevels
     */
    legend_title = "";
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
    selected_data_key = "baseline";
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
    language = "en_US";
    /**
     * e.g. % damage per second, see `x_axis_texts`
     */
    x_axis_title = "";
    /**
     * e.g. Trinket - not visible anywhere
     */
    y_axis_title = "";
    /**
     * either "total", "relative", or "absolute"
     */
    value_calculation = "total";

    // Calculated values

    /**
     * max dps value found in `data`
     */
    global_max_value = -1;

    // Constants
    unit = {
        "total": "",
        "relative": "%",
        "absolute": "Δ"
    };

    x_axis_texts = {
        "total": "total damage per second (character)",
        "relative": "% damage per second",
        "absolute": "absolute damage per second"
    };

    /**
     * e.g. trinkets, secondary_distributions, races,...
     */
    data_type = "";
    wow_spec = "";
    wow_class = "";
    secondary_sum = -1;

    data_type_defaults = {
        "trinkets": {
            "value_calculation": "relative"
        },
        "phials": {
            "value_calculation": "relative"
        },
        "potions": {
            "value_calculation": "relative"
        },
        "power_infusion": {
            "value_calculation": "absolute"
        },
        "windfury_totem": {
            "value_calculation": "absolute"
        },
        "trinket_compare": {
            "value_calculation": "absolute"
        },
        "talent_target_scaling": {
            "value_calculation": "total"
        },
        "weapon_enchantments": {
            "value_calculation": "relative"
        }
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
        for (let key of key_chain) {
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
        if (this.data_type_defaults.hasOwnProperty(this.data_type) &&
            this.data_type_defaults[this.data_type].hasOwnProperty(property)) {
            this[property] = this.data_type_defaults[this.data_type][property];
        }
    }

    /**
     * Set subtitle from data
     */
    _set_subtitle() {
        let subtitle_parts = [];
        if (this.loaded_data.hasOwnProperty("profile")) {
            subtitle_parts.push(this.loaded_data["profile"]["character"]["spec"] + " " +
                this.loaded_data["profile"]["character"]["class"]);
        }
        subtitle_parts.push(this.loaded_data["simc_settings"]["fight_style"]);
        subtitle_parts.push("UTC " + this.loaded_data["metadata"]["timestamp"]);

        this.subtitle = subtitle_parts.join(" | ");
    }

    /**
     * Set title for trinket compare chart type
     */
    _setTrinketCompareTitle() {
        // Extract the item name
        this._extract_data_from_loaded_data("item_name", ["item_name"]);

        // Default formatting as fallback
        const formatItemName = (name) => name.replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // If no translations are available, use formatted name
        if (!this.loaded_data.translations) {
            this.title = formatItemName(this.item_name);
            return;
        }

        // Try to get item-specific translations
        const itemTranslations = this.loaded_data.translations[this.item_name];
        if (itemTranslations) {
            // Try current language first, then fall back to English
            this.title = itemTranslations[this.language] ||
                itemTranslations["en_US"] ||
                formatItemName(this.item_name);
            return;
        }

        // Try top-level translations
        this.title = this.loaded_data.translations[this.language] ||
            this.loaded_data.translations["en_US"] ||
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
        let title = document.createElement("div");
        title.classList.add("bm-title");
        title.appendChild(document.createTextNode(this.title));
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
        let subtitle = document.createElement("div");
        subtitle.classList.add("bm-subtitle");
        subtitle.appendChild(document.createTextNode(this.subtitle));
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
        let simc_subtitle = document.createElement("div");
        simc_subtitle.classList.add("bm-subtitle");

        let prefix = document.createTextNode("SimulationCraft hash: ");
        simc_subtitle.appendChild(prefix);

        let link = document.createElement("a");
        link.href = "https://github.com/simulationcraft/simc/commit/" + this.simc_hash;
        link.text = "#" + this.simc_hash;
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

        if (!this.root_element.dataset.hasOwnProperty("loadedData") ||
            (this.root_element.dataset.hasOwnProperty("loadedData") &&
                this.root_element.dataset.loadedData === "")) {
            throw new Error("Data must be loaded in Element before attempting to create the associated chart.");
        }

        try {
            this.loaded_data = JSON.parse(this.root_element.dataset.loadedData);

            if (this.loaded_data.status === "error" && this.loaded_data.message !== undefined) {
                console.error("bm-charts encountered an error while loading data. Error:", this.loaded_data.message);
                return;
            }

            this._extract_data_from_loaded_data("data_type", ["data_type"]);
            this._extract_data_from_loaded_data("element_id", ["element_id"]);
            this._extract_setting_from_root_element("language", "language");
            this.language = window.bmUtils.detectUserLanguage(this.root_element);

            if (this.data_type === "trinket_compare") {
                this._setTrinketCompareTitle();
            } else {
                // For all other chart types, use the standard method
                this._extract_data_from_loaded_data("title", ["data_type"]);
            }

            this._set_subtitle();
            this._extract_data_from_loaded_data("simc_hash", ["metadata", "SimulationCraft"]);

            // Set legend title based on chart type
            if (this.data_type === "races") {
                this.legend_title = "Race";
            } else if (["trinkets"].includes(this.data_type)) {
                this.legend_title = "Itemlevels";
            } else if (["phials", "potions", "weapon_enchantments"].includes(this.data_type)) {
                this.legend_title = "Ranks";
            } else if (this.data_type === "talent_target_scaling") {
                this.legend_title = "Targets";
            } else if (["windfury_totem", "power_infusion", "trinket_compare"].includes(this.data_type)) {
                this.legend_title = "Effect";
            } else {
                this.legend_title = "legend_title not set";
            }

            this._extract_data_from_loaded_data("legend_title", ["legend_title"]);
            this._extract_data_from_loaded_data("data", ["data"]);
            this._set_default_from_data_type("value_calculation");
            this._extract_setting_from_root_element("value_calculation", "valueCalculation");
            this._extract_setting_from_root_element("selected_data_key", "selectedDataKey");

            // Set sole data point as selected data for secondary distributions
            if (Object.keys(this.data).indexOf(this.selected_data_key) === -1) {
                this.selected_data_key = Object.keys(this.data)[0];
            }

            this.x_axis_title = this.x_axis_texts[this.value_calculation];
            this._extract_data_from_loaded_data("x_axis_title", ["x_axis_title"]);
            this._extract_data_from_loaded_data("y_axis_title", ["y_axis_title"]);
            this._extract_data_from_loaded_data("wow_spec", ["profile", "character", "spec"]);
            this._extract_data_from_loaded_data("wow_class", ["profile", "character", "class"]);
            this._extract_data_from_loaded_data("secondary_sum", ["secondary_sum"]);

            // Extract series names - optional
            this._extract_data_from_loaded_data("series_names", ["simulated_steps"]);
            if (this.series_names.length === 0) {
                for (let key_value_object of Object.values(this.data)) {
                    for (let series of Object.keys(key_value_object)) {
                        let parsed_int = Number.parseInt(series);
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
            this._extract_data_from_loaded_data("sorted_data_keys", ["sorted_data_keys"])
            if (this.sorted_data_keys.length === 0) {
                let key_value = {};
                for (let key of Object.keys(this.data)) {
                    key_value[key] = Math.max(...Object.values(this.data[key]));
                }
                this.sorted_data_keys = Object.keys(key_value).sort((a, b) => key_value[b] - key_value[a]);
            }
            this._extract_data_from_loaded_data("sorted_data_data_keys", ["sorted_data_keys"]);

            // Handle base values - optional
            // create if no keys
            // extend if number of keys === 1 and number of series_names > 1
            this._extract_data_from_loaded_data("base_values", ["data", "baseline"]);
            if (Object.keys(this.base_values).length === 0) {
                // No base_values found, default to 0
                for (let series of this.series_names) {
                    this.base_values[series] = 0;
                }
            } else if (Object.keys(this.base_values).length === 1 && this.series_names.length > 1) {
                // One base_value found but multiple series, use same value for all
                let tmp_value = Object.values(this.base_values)[0];
                for (let series of this.series_names) {
                    this.base_values[series] = tmp_value;
                }
            } else if (Object.keys(this.base_values).length == this.series_names.length) {
                // As many base_values as series_names - do nothing
            } else {
                throw "base_value must be an empty object, have only one key, or the same length and keys as series_names." + this.data_type;
            }

            // Extract optional data
            this._extract_data_from_loaded_data("language_dict", ["translations"]);
            this._extract_data_from_loaded_data("item_id_dict", ["item_ids"]);
            this._extract_data_from_loaded_data("spell_id_dict", ["spell_ids"]);
            this._extract_setting_from_root_element("show_top", "showTop", this._convert_to_number);
            this._extract_setting_from_root_element("filter_trinket_itemlevels", "filterTrinketItemlevels", this._convert_to_number_list);
            this._extract_setting_from_root_element("filter_trinket_sources", "filterTrinketSources", this._convert_to_string_list);
            this._extract_setting_from_root_element("filter_trinket_active_passive", "filterTrinketActivePassive", this._convert_to_string_list);
            this._extract_setting_from_root_element("enable_title", "enableTitle", this._convert_to_bool);
            this._extract_setting_from_root_element("enable_subtitle", "enableSubtitle", this._convert_to_bool);
            this._extract_setting_from_root_element("enable_simc_subtitle", "enableSimcSubtitle", this._convert_to_bool);
            this._extract_setting_from_root_element("enable_tooltips", "enableTooltips", this._convert_to_bool);
            this._extract_setting_from_root_element("enable_legend", "enableLegend", this._convert_to_bool);

            // Calculate global max value based on chart type
            if (this.data_type === "races") {
                this.global_max_value = Math.max(...Object.values(this.data));
            } else if (["power_infusion", "windfury_totem", "trinket_compare"].indexOf(this.data_type) > -1) {
                let biggest_diff = 0;
                let base_value = 0;
                let local_diff = 0;

                for (const spec of this.sorted_data_keys) {
                    base_value = this.base_values[spec] || this.data["{" + spec + "}"];

                    if (this.value_calculation === "relative") {
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
                    ...Object.values(this.data).map(element =>
                        Math.max(...Object.values(element))
                    )
                );
            }
        } catch (error) {
            console.error("Error in BmChartData constructor:", error);
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
        return input.split(";");
    }

    /**
     * Convert semicolon-separated string to array of numbers
     * @param {String} input - Input string
     * @returns {Array<Number>} Array of numbers
     */
    _convert_to_number_list(input) {
        return input.split(";").map(value => Number.parseInt(value));
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
        return changed_value * 100 / base_value;
    }

    /**
     * Calculate relative gain as percentage difference
     * E.g. changed_value=80, base_value=100 => -20 (%)
     * @param {Number} changed_value - Changed value
     * @param {Number} base_value - Base value
     * @returns {Number} Percentage gain
     */
    get_relative_gain(changed_value, base_value) {
        let relative_gain = this._get_relative_value(changed_value, base_value);
        return relative_gain - 100.0;
    }

    /**
     * Calculate absolute gain (positive only)
     * @param {Number} changed_value - Changed value
     * @param {Number} base_value - Base value
     * @returns {Number} Absolute gain (minimum 0)
     */
    get_absolute_gain(changed_value, base_value) {
        let value = changed_value - base_value;
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
            base += "spell=" + this.spell_id_dict[key];
        } else if (key in this.item_id_dict) {
            base += "item=" + this.item_id_dict[key];
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
        if (!name.includes("[")) {
            return name;
        }

        let to_be_shortened = name.split("[")[0].trim();
        let specifier = name.split("[")[1].split("]")[0];
        let name_sections = to_be_shortened.split(":");
        let name_section_parts = [];

        for (const name_section of name_sections) {
            name_section_parts.push(name_section.trim().split(" ").map(part => part[0]));
        }

        let new_name = "";
        for (const characters of name_section_parts) {
            if (new_name !== "") {
                new_name += ":";
            }
            new_name += characters.join("");
        }

        new_name += " [" + specifier + "]";
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

        let translated_name_node = document.createTextNode(translated_name);
        let url = this._get_wowhead_url(key);
        if (url === undefined) {
            return translated_name_node;
        }
        let link = document.createElement("a");
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
        if (value_calculation === "total") {
            return this.data[key][series];
        } else if (value_calculation === "absolute") {
            return this.get_absolute_gain(this.data[key][series], this.base_values[series]);
        } else if (value_calculation === "relative") {
            // Special case for augmentation evokers to compare the gain to 
            // their own base dps without the group dps
            let relative_gain = -1;
            if (this.wow_class === "evoker" && this.wow_spec === "augmentation") {
                let aug_base_value = this.loaded_data["profile"]["metadata"]["base_dps"];
                let raw_gain = this.get_absolute_gain(this.data[key][series], this.base_values[series]);
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
    add_tooltip(element, tooltip, position = "right") {
        if (!this.enable_tooltips) {
            return;
        }
        element.setAttribute("data-type", "bm-tooltip");
        element.setAttribute("data-bm-tooltip-text", tooltip);
        element.setAttribute("data-bm-tooltip-placement", position);
    }

    /**
     * Clear content from root element
     */
    clean_up_root() {
        this.root_element.innerHTML = "";
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
    bm_chart_data;

    /**
     * Vertical comparison line
     * @type {HTMLElement}
     */
    vertical_line;

    /**
     * Create a new bar chart
     * @param {BmChartData} chart_data - Chart data
     */
    constructor(chart_data = new BmChartData()) {
        this.vertical_line = undefined;
        this.bm_chart_data = chart_data;

        this.bm_chart_data.clean_up_root();
        this.create_chart();

        try {
            $WowheadPower.refreshLinks();
        } catch (error) {
            console.error("Error refreshing WowheadPower links:", error);
        }

        add_bm_tooltips_to_dom();
        BmUIUtils.addCSS(BmChartStyleId, BmChartStyleUrl);

        if (["bloodmallet.com", "127.0.0.1:8000"].includes(window.location.host)) {
            try {
                provide_meta_data(this.bm_chart_data, this.bm_chart_data.loaded_data);
            } catch (error) {
                console.log("Failed to provide metadata to bloodmallet.com:", error);
            }
        }
    }

    /**
     * Create legend for the chart
     * @param {HTMLElement} root_element - Root element
     * @param {Array<[Number, String]>} series_index_names - Series data
     */
    _create_legend(root_element, series_index_names) {
        if (!this.bm_chart_data.enable_legend) {
            return;
        }

        let legend = document.createElement("div");
        legend.classList.add("bm-legend");
        let legend_title = document.createElement("div");
        legend_title.classList.add("bm-legend-title");
        legend_title.appendChild(document.createTextNode(this.bm_chart_data.legend_title));
        legend.appendChild(legend_title);
        let legend_items = document.createElement("div");
        legend_items.classList.add("bm-legend-items");
        for (let [index, series] of series_index_names) {
            let legend_series = document.createElement("div");
            legend_series.classList.add("bm-legend-item", "bm-bar-group-" + (index + 1));
            legend_series.appendChild(document.createTextNode(series));
            legend_items.appendChild(legend_series);
            // required to space the legend items
            legend_items.appendChild(document.createTextNode(" "));
        }
        legend.appendChild(legend_items);

        root_element.appendChild(legend);
    }

    /**
     * Create the complete chart
     */
    create_chart() {
        // filter out unwanted data
        let effective_series_index_names = Array.from(this.bm_chart_data.series_names.entries()).filter(([index, series]) => {
            // filter by itemlevels
            return !this.bm_chart_data.filter_trinket_itemlevels.includes(series);
        })

        let effective_sorted_data_keys = this.bm_chart_data.sorted_data_keys.slice().filter((key) => {
            // remove "baseline"
            return key !== "baseline";
        }).filter((key) => {
            // filter by data_source
            if (this.bm_chart_data.loaded_data.hasOwnProperty("data_sources")) {
                return !this.bm_chart_data.filter_trinket_sources.includes(this.bm_chart_data.loaded_data["data_sources"][key])
            }
            return true;
        }).filter((value) => {
            // filter by **active** part of active_passive
            if (this.bm_chart_data.data_type === "trinkets" && (this.bm_chart_data.filter_trinket_active_passive.includes("active") || this.bm_chart_data.filter_trinket_active_passive.includes("Active"))) {
                return this.bm_chart_data.loaded_data["data_active"][value] === false;
            }
            return true;
        }).filter((value) => {
            // filter by **passive** part of active_passive
            if (this.bm_chart_data.data_type === "trinkets" && (this.bm_chart_data.filter_trinket_active_passive.includes("passive") || this.bm_chart_data.filter_trinket_active_passive.includes("Passive"))) {
                return this.bm_chart_data.loaded_data["data_active"][value] === true;
            }
            return true;
        }).filter((key) => {
            // filter by no-remaining series
            if (this.bm_chart_data.data_type === "trinkets") {
                for (const tmp_series of Object.keys(this.bm_chart_data.data[key])) {
                    if (!this.bm_chart_data.filter_trinket_itemlevels.includes(
                        Number.parseInt(tmp_series)
                    )) {
                        return true;
                    }
                }
                return false;
            } else {
                return true;
            }
        }).sort((a, b) => {
            let a_dps_object = structuredClone(this.bm_chart_data.data[a]);
            for (let key of Object.keys(a_dps_object)) {
                if (this.bm_chart_data.filter_trinket_itemlevels.includes(
                    Number.parseInt(key)
                )) {
                    delete a_dps_object[Number.parseInt(key)];
                }
            }
            let b_dps_object = structuredClone(this.bm_chart_data.data[b]);
            for (let key of Object.keys(b_dps_object)) {
                if (this.bm_chart_data.filter_trinket_itemlevels.includes(
                    Number.parseInt(key)
                )) {
                    delete b_dps_object[Number.parseInt(key)];
                }
            };
            let a_dps = Math.max(...Object.values(a_dps_object));
            let b_dps = Math.max(...Object.values(b_dps_object));
            if (Number.isInteger(a_dps_object) && Number.isInteger(b_dps_object)) {
                a_dps = a_dps_object;
                b_dps = b_dps_object;
            }
            // power infusion special way to sort
            if (["power_infusion", "windfury_totem", "trinket_compare"].indexOf(this.bm_chart_data.data_type) > -1) {
                a_dps = this.bm_chart_data.data[a] - (this.bm_chart_data.base_values[a] || this.bm_chart_data.data["{" + a + "}"]);
                b_dps = this.bm_chart_data.data[b] - (this.bm_chart_data.base_values[b] || this.bm_chart_data.data["{" + b + "}"]);
                if (this.bm_chart_data.value_calculation === "relative") {
                    a_dps = a_dps / this.bm_chart_data.data[a];
                    b_dps = b_dps / this.bm_chart_data.data[b];
                }
            }
            return b_dps - a_dps;
        });
        if (this.bm_chart_data.show_top > 0) {
            effective_sorted_data_keys = effective_sorted_data_keys.slice(0, this.bm_chart_data.show_top);
        }

        let root = this.bm_chart_data.root_element;
        root.classList.add("bm-bar-chart");

        this.bm_chart_data.add_title(root);
        this.bm_chart_data.add_subtitle(root);
        this.bm_chart_data.add_simc_subtitle(root);
        this._create_legend(root, effective_series_index_names);

        // axis titles
        let axis_titles = document.createElement("div");
        axis_titles.classList.add("bm-axis", "bm-row");
        let key_title = document.createElement("div");
        key_title.classList.add("bm-key-title");
        // key_title.appendChild(document.createTextNode(this.y_axis_title));
        axis_titles.appendChild(key_title);
        // axis title
        let bar_title = document.createElement("div");
        bar_title.classList.add("bm-bar-title");
        // min value
        let min = document.createElement("span");
        min.classList.add("bm-bar-min")
        if (["absolute", "relative"].indexOf(this.bm_chart_data.value_calculation) > -1) {
            let unitTextNode = BmUIUtils.createUnitTextNode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]);

            if (this.bm_chart_data.value_calculation === "absolute") {
                min.appendChild(unitTextNode);
                min.appendChild(document.createTextNode(0));
            } else if (this.bm_chart_data.value_calculation === "relative") {
                min.appendChild(document.createTextNode(0));
                min.appendChild(unitTextNode);
            }
        } else {
            min.appendChild(document.createTextNode(0));
        }

        bar_title.appendChild(min);
        bar_title.appendChild(document.createTextNode(this.bm_chart_data.x_axis_title));
        // max value
        let max = document.createElement("span");
        max.classList.add("bm-bar-max")
        if (["absolute", "relative"].indexOf(this.bm_chart_data.value_calculation) > -1) {
            let unitTextNode = BmUIUtils.createUnitTextNode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]);

            let base_value = this.bm_chart_data.base_values[this.bm_chart_data.series_names[this.bm_chart_data.series_names.length - 1]];

            if (this.bm_chart_data.value_calculation === "absolute") {
                max.appendChild(unitTextNode);
                if (["power_infusion", "windfury_totem", "trinket_compare"].indexOf(this.bm_chart_data.data_type) > -1) {
                    max.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(this.bm_chart_data.global_max_value)));
                } else {
                    max.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_absolute_gain(this.bm_chart_data.global_max_value, base_value))));
                }
            } else if (this.bm_chart_data.value_calculation === "relative") {
                let relative_gain = -1;
                if (this.bm_chart_data.wow_class === "evoker" && this.bm_chart_data.wow_spec === "augmentation") {
                    let aug_base_value = this.bm_chart_data.loaded_data["profile"]["metadata"]["base_dps"];
                    let raw_gain = this.bm_chart_data.get_absolute_gain(this.bm_chart_data.global_max_value, base_value);
                    // console.log("augmentation had a raw gain of", raw_gain, "dps compared to its own max dps of", aug_base_value);
                    relative_gain = this.bm_chart_data.get_relative_gain(aug_base_value + raw_gain, aug_base_value);
                } else {
                    if (["power_infusion", "windfury_totem", "trinket_compare"].indexOf(this.bm_chart_data.data_type) > -1) {
                        relative_gain = this.bm_chart_data.global_max_value;
                    } else {
                        relative_gain = this.bm_chart_data.get_relative_gain(this.bm_chart_data.global_max_value, base_value);
                    }
                }

                max.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(relative_gain)));
                max.appendChild(unit);
            }
        } else {
            max.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(this.bm_chart_data.global_max_value, 0)));
        }
        bar_title.appendChild(max);
        axis_titles.appendChild(bar_title);
        root.appendChild(axis_titles);

        // actual data / bars
        for (let key of effective_sorted_data_keys) {
            let row = document.createElement("div");
            row.classList.add("bm-row");
            let key_div = document.createElement("div");
            key_div.classList.add("bm-key");
            key_div.appendChild(this.bm_chart_data.get_wowhead_link(key));
            row.appendChild(key_div);
            let bar = document.createElement("div");
            bar.classList.add("bm-bar");
            // add bar elements
            let steps = [];
            let previous_value = 0;
            // chart types without multiple series
            if (this.bm_chart_data.data_type === "races") {
                // absolute calc
                let relative_value = (this.bm_chart_data.data[key]) * 100 / (this.bm_chart_data.global_max_value);
                if (relative_value - previous_value >= 0.0) {
                    steps.push(relative_value - previous_value);
                    previous_value = relative_value;
                } else {
                    steps.push(0);
                }
                let bar_part = document.createElement("div");
                bar_part.classList.add("bm-bar-element", "bm-bar-group-1");
                bar.appendChild(bar_part);
                bar_part.addEventListener("click", (ev) => {
                    this.create_vertical_line(ev);
                });
            } else if (["power_infusion", "windfury_totem", "trinket_compare"].indexOf(this.bm_chart_data.data_type) > -1) {
                let value = 0;
                let base_value = this.bm_chart_data.base_values[key] || this.bm_chart_data.data["{" + key + "}"];

                if (this.bm_chart_data.value_calculation === "relative") {
                    //  relative
                    value = ((this.bm_chart_data.data[key] - base_value) * 100 / this.bm_chart_data.data[key]) * 100 / this.bm_chart_data.global_max_value;
                } else {
                    // absolute calc
                    value = (this.bm_chart_data.data[key] - base_value) * 100 / this.bm_chart_data.global_max_value;
                }
                if (value - previous_value >= 0.0) {
                    steps.push(value - previous_value);
                    previous_value = value;
                } else {
                    steps.push(0);
                }
                let bar_part = document.createElement("div");
                bar_part.classList.add("bm-bar-element", "bm-bar-group-1");
                bar.appendChild(bar_part);
                bar_part.addEventListener("click", (ev) => {
                    this.create_vertical_line(ev);
                });
            }
            for (let [index, series] of effective_series_index_names) {
                if (!this.bm_chart_data.data[key].hasOwnProperty(series)) {
                    // data doesn't have series element, skipping
                    continue;
                }
                // relative calc
                let relative_value = (this.bm_chart_data.data[key][series] - this.bm_chart_data.base_values[series]) * 100 / (this.bm_chart_data.global_max_value - this.bm_chart_data.base_values[series]);
                if (relative_value - previous_value >= 0.0) {
                    steps.push(relative_value - previous_value);
                    previous_value = relative_value;
                } else {
                    steps.push(0);
                }
                let bar_part = document.createElement("div");
                bar_part.classList.add("bm-bar-element", "bm-bar-group-" + (index + 1));

                // add final stack value as readable text
                if (this.bm_chart_data.enable_end_of_bar_values) {
                    let key_available_series = Object.keys(this.bm_chart_data.data[key]);
                    let filtered_available_series = key_available_series.filter((value) => {
                        return !this.bm_chart_data.filter_trinket_itemlevels.includes(value);
                    }).map((value) => {
                        return Number.parseInt(value);
                    });
                    let highest_available_series_of_key = Math.max(...filtered_available_series);
                    console.log(key_available_series, filtered_available_series, highest_available_series_of_key, series);
                    if (series === highest_available_series_of_key) {
                        let final_stack_value = document.createElement("span");
                        final_stack_value.classList.add("bm-bar-final-value");
                        final_stack_value.appendChild(
                            document.createTextNode(
                                this.bm_chart_data.convert_number_to_local(
                                    this.bm_chart_data.get_value(key, series, this.bm_chart_data.value_calculation)
                                )
                            )
                        );
                        if (this.bm_chart_data.unit[this.bm_chart_data.value_calculation].length > 0) {
                            final_stack_value.appendChild(
                                BmUIUtils.createUnitTextNode(
                                    this.bm_chart_data.unit[this.bm_chart_data.value_calculation]
                                )
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

                bar_part.addEventListener("click", (ev) => {
                    this.create_vertical_line(ev);
                });
            }
            // add grid template
            bar.style.gridTemplateColumns = [...steps, "auto"].join("% ");
            // add tooltip
            // bootstrap
            // bar.dataset.toggle = "tooltip";
            // bar.dataset.placement = "left";
            // bar.dataset.html = "true";
            // bar.title = this.create_tooltip(key);
            // bm-tooltips
            this.bm_chart_data.add_tooltip(bar, this.create_tooltip(key, effective_series_index_names), "left");

            row.appendChild(bar);
            root.appendChild(row);
        }

    }

    /**
     * Create the string representation of a html structured tooltip.
     * @param {String} key 
     * @param {Array<[Number, String]>} index_series
     * @returns {String}
     */
    create_tooltip(key, indexed_series) {
        // use own local copy
        indexed_series = indexed_series.slice();
        let container = document.createElement("div");
        container.classList.add("bm-tooltip-container");

        let title = document.createElement("div");
        title.classList.add("bm-tooltip-title");
        let translated_name = this.bm_chart_data.get_translated_name(key);
        // translated_name = this._shorten_name(translated_name);
        title.appendChild(document.createTextNode(translated_name));
        container.appendChild(title);

        // inverse sort to have the table start with the highest value
        for (let [index, series] of indexed_series.reverse()) {
            if (!this.bm_chart_data.data[key].hasOwnProperty(series)) {
                // data doesn't have series element, skipping
                continue;
            }
            let row = document.createElement("div");
            row.classList.add("bm-tooltip-row");

            let key_div = document.createElement("div");
            key_div.classList.add("bm-tooltip-key", "bm-bar-group-" + (index + 1));
            key_div.appendChild(document.createTextNode(series));
            row.appendChild(key_div);

            let value_div = document.createElement("div");
            value_div.classList.add("bm-tooltip-value");
            let mantissa = 2;
            if (this.bm_chart_data.value_calculation === "total") {
                mantissa = 0;
            }
            let value = this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_value(key, series, this.bm_chart_data.value_calculation), mantissa);
            
            // Add unit in proper position
            const unit = this.bm_chart_data.unit[this.bm_chart_data.value_calculation];
            if (this.bm_chart_data.value_calculation === "absolute" && unit.length > 0) {
                value_div.appendChild(BmUIUtils.createUnitTextNode(unit));
            }

            value_div.appendChild(document.createTextNode(value));

            if (this.bm_chart_data.value_calculation === "relative" && unit.length > 0) {
                value_div.appendChild(BmUIUtils.createUnitTextNode(unit));
            }
            row.appendChild(value_div);

            container.appendChild(row);
        }
        // chart types without multiple series
        if (this.bm_chart_data.data_type === "races") {
            let row = document.createElement("div");
            row.classList.add("bm-tooltip-row");

            let key_div = document.createElement("div");
            key_div.classList.add("bm-tooltip-key", "bm-bar-group-1");
            key_div.appendChild(document.createTextNode(key));
            row.appendChild(key_div);

            let value_div = document.createElement("div");
            value_div.classList.add("bm-tooltip-value");
            let value = this.bm_chart_data.convert_number_to_local(this.bm_chart_data.data[key]);
            // let value = this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_value(key, series, this.bm_chart_data.value_calculation));
            value_div.appendChild(document.createTextNode(value));

            // Add unit if applicable
            const unit = this.bm_chart_data.unit[this.bm_chart_data.value_calculation];
            if (unit.length > 0) {
                value_div.appendChild(BmUIUtils.createUnitTextNode(unit));
            }
            row.appendChild(value_div);

            container.appendChild(row);
        } else if (["power_infusion", "windfury_totem", "trinket_compare"].indexOf(this.bm_chart_data.data_type) > -1) {
            let row = document.createElement("div");
            row.classList.add("bm-tooltip-row");

            let key_div = document.createElement("div");
            key_div.classList.add("bm-tooltip-key", "bm-bar-group-1");
            let abbreviation = {
                "power_infusion": "PI",
                "windfury_totem": "WFT",
                "trinket_compare": "Trinket"
            }
            key_div.appendChild(document.createTextNode(abbreviation[this.bm_chart_data.data_type]));
            row.appendChild(key_div);

            let value_div = document.createElement("div");
            value_div.classList.add("bm-tooltip-value");
            let value = -1;
            let base_value = this.bm_chart_data.base_values[key] || this.bm_chart_data.data["{" + key + "}"];

            if (this.bm_chart_data.value_calculation === "relative") {
                value = this.bm_chart_data.convert_number_to_local((this.bm_chart_data.data[key] - base_value) * 100 / this.bm_chart_data.data[key]);
            } else {
                value = this.bm_chart_data.convert_number_to_local(this.bm_chart_data.data[key] - base_value);
            }
            // let value = this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_value(key, series, this.bm_chart_data.value_calculation));
            value_div.appendChild(document.createTextNode(value));
            // Add unit if applicable
            const unit = this.bm_chart_data.unit[this.bm_chart_data.value_calculation];
            if (unit.length > 0) {
                value_div.appendChild(BmUIUtils.createUnitTextNode(unit));
            }
            row.appendChild(value_div);

            container.appendChild(row);
        }


        let legend = document.createElement("div");
        legend.classList.add("bm-tooltip-row");

        let key_title = document.createElement("div");
        key_title.classList.add("bm-tooltip-key-title", "bm-tooltip-width-marker-top");
        key_title.appendChild(document.createTextNode(this.bm_chart_data.legend_title));
        legend.appendChild(key_title);

        let value_title = document.createElement("div");
        value_title.classList.add("bm-tooltip-value-title", "bm-tooltip-width-marker-top");
        value_title.appendChild(document.createTextNode(this.bm_chart_data.x_axis_title));
        legend.appendChild(value_title);

        container.appendChild(legend);

        return container.outerHTML;
    }

    remove_vertical_line() {
        if (this.vertical_line !== undefined) {
            this.vertical_line.remove();
            this.vertical_line = undefined;
        }
    }

    /**
     * Creates a vertical line to more easily compare values. 
     * In case a line exists, the old line is removed. 
     * In case the same element was clicked for the second time, the old line is removed.
     * @param {Event} event click event
     */
    create_vertical_line(event) {
        let vertical_line_box = undefined;
        if (this.vertical_line !== undefined) {
            vertical_line_box = this.vertical_line.getBoundingClientRect();
            this.remove_vertical_line();
        }

        let root = this.bm_chart_data.root_element;

        let parent_box = root.getBoundingClientRect();
        let event_box = event.target.getBoundingClientRect();
        let left = event_box.right + window.scrollX;

        let line = document.createElement("div");
        line.style.position = "absolute";
        line.style.width = "0px";
        line.style.border = "1px solid white";
        line.style.height = parent_box.height + "px";
        line.style.left = left + "px";
        root.appendChild(line);
        this.vertical_line = line;

        // in case the user clicked on the same element twice, the line shall get removed
        let line_box = line.getBoundingClientRect();
        if (vertical_line_box !== undefined && vertical_line_box.x == line_box.x) {
            this.remove_vertical_line();
        }
    }
}

class BmRadarChart {
    /**
     * @type {BmChartData}
     */
    bm_chart_data;

    constructor(chart_data = new BmChartData()) {
        this.bm_chart_data = chart_data;

        this.bm_chart_data.clean_up_root();

        this.create_chart();

        try {
            $WowheadPower.refreshLinks();
        } catch (error) {
            console.error("Error occured while trying to refresh WowheadPower links.");
            console.error(error);
        }
        add_bm_tooltips_to_dom();
        BmUIUtils.addCSS(BmChartStyleId, BmChartStyleUrl);

        if (["bloodmallet.com", "127.0.0.1:8000"].includes(window.location.host)) {
            provide_meta_data(this.bm_chart_data, this.bm_chart_data.loaded_data);
        }
    }

    create_chart() {
        let size = 200;
        let zoom = 1 / 5;
        let c_h_m_v = this.bm_chart_data.sorted_data_data_keys[this.bm_chart_data.selected_data_key][0].split("_");
        let v_crit = parseInt(c_h_m_v[0]);
        let v_haste = parseInt(c_h_m_v[1]);
        let v_mastery = parseInt(c_h_m_v[2]);
        let v_vers = parseInt(c_h_m_v[3]);
        let dps = this.bm_chart_data.data[this.bm_chart_data.selected_data_key][this.bm_chart_data.sorted_data_data_keys[this.bm_chart_data.selected_data_key][0]];

        let root = this.bm_chart_data.root_element;
        root.classList.add("bm-radar-root");

        root.appendChild(this.create_top());

        let table = document.createElement("div");
        table.classList.add("bm-radar-center");
        root.appendChild(table);

        table.appendChild(this.create_distribution_table(v_crit, v_haste, v_mastery, v_vers, dps));

        table.appendChild(this.create_main_radar(v_crit, v_haste, v_mastery, v_vers, dps, size));

        let stacked_overview_table = document.createElement("div");
        // stacked_overview_table.style.display = "table";
        stacked_overview_table.appendChild(this.create_mini_radar_row(v_crit, v_haste, v_mastery, v_vers, dps, size, zoom, 0));
        stacked_overview_table.appendChild(this.create_mini_radar_row(70, 10, 10, 10, dps, size, zoom));
        stacked_overview_table.appendChild(this.create_mini_radar_row(10, 70, 10, 10, dps, size, zoom));
        stacked_overview_table.appendChild(this.create_mini_radar_row(10, 10, 70, 10, dps, size, zoom));
        stacked_overview_table.appendChild(this.create_mini_radar_row(10, 10, 10, 70, dps, size, zoom));
        table.appendChild(stacked_overview_table);
    }

    /**
     * Create the top section of the radar chart
     * @returns {HTMLElement}
     */
    create_top() {

        let top = document.createElement("div");
        top.classList.add("bm-radar-top");

        this.bm_chart_data.add_title(top);
        this.bm_chart_data.add_subtitle(top);
        this.bm_chart_data.add_simc_subtitle(top);

        return top;
    }

    create_distribution_table(crit, haste, mastery, vers, dps) {
        let table = document.createElement("div");
        table.classList.add("bm-stat-table");

        let floater = document.createElement("div");
        floater.classList.add("bm-stat-floater");
        table.appendChild(floater);

        // header
        let header = document.createElement("div");
        header.classList.add("bm-stat-header");
        floater.appendChild(header);

        // let stat = document.createElement("div");
        // stat.classList.add("bm-stat-cell");
        // stat.appendChild(document.createTextNode("Best Distribution"));
        // let distribution = document.createElement("div");
        // distribution.classList.add("bm-stat-cell");
        // distribution.appendChild(document.createTextNode("Ratio"));
        let best_ratio = document.createElement("div");
        best_ratio.classList.add("bm-stat-cell");
        best_ratio.appendChild(document.createTextNode("Best Ratio: " + this.bm_chart_data.convert_number_to_local(dps, 0)));
        best_ratio.appendChild(BmUIUtils.createUnitTextNode("dps"));
        // let ingame_value = document.createElement("div");
        // ingame_value.classList.add("bm-stat-cell");
        // ingame_value.appendChild(document.createTextNode("Ingame"));

        // header.appendChild(stat);
        // header.appendChild(distribution);
        header.appendChild(best_ratio);
        // header.appendChild(ingame_value);

        function add_row(description, ratio, rating, ingame) {
            function add_cell(text, suffix = undefined) {
                let element = document.createElement("div");
                element.appendChild(document.createTextNode(text));
                element.classList.add("bm-stat-cell");
                if (suffix !== undefined) {
                    element.appendChild(BmUIUtils.createUnitTextNode(suffix));
                }
                return element;
            }

            let row = document.createElement("div");
            row.classList.add("bm-stat-row");

            let description_div = add_cell(description);
            description_div.classList.add("bm-stat-cell-stat");
            // row.appendChild(description_div);
            row.appendChild(add_cell(ratio, " " + description));
            // row.appendChild(add_cell(rating, " " + description));
            // row.appendChild(add_cell(ingame, "%"));
            // TODO: add rating as tooltip rounded to hundreds

            return row;
        }
        function get_rating(fraction, sum) {
            return Math.round(sum * fraction / 100);
        }

        function get_ingame(fraction, sum, type) {
            // TODOS:
            // * stat start values
            // * stat start value changes based on talents...
            // * stat value conversion changes based on talents...
            // * diminishing return or stats...
            let value = -1
            if (type !== "Mastery") {
                // simple static conversion (maybe not due to special class multipliers?)
                const multipliers = {
                    "Critical Strike": 1 / 180,
                    "Haste": 1 / 170,
                    "Versatility": 1 / 205
                };
                let base_value = -1;
                // get base value for each spec and stat
                base_value = 0;

                value = base_value + get_rating(fraction, sum) * multipliers[type];

            } else {
                value = "TBD soon";
            }

            // TODO: apply diminishing returns
            return value
        }

        floater.appendChild(add_row("Critical Strike", crit, get_rating(crit, this.bm_chart_data.secondary_sum), get_ingame(crit, this.bm_chart_data.secondary_sum, "Critical Strike")));
        floater.appendChild(add_row("Haste", haste, get_rating(haste, this.bm_chart_data.secondary_sum), get_ingame(haste, this.bm_chart_data.secondary_sum, "Haste")));
        floater.appendChild(add_row("Mastery", mastery, get_rating(mastery, this.bm_chart_data.secondary_sum), get_ingame(mastery, this.bm_chart_data.secondary_sum, "Mastery")));
        floater.appendChild(add_row("Versatility", vers, get_rating(vers, this.bm_chart_data.secondary_sum), get_ingame(vers, this.bm_chart_data.secondary_sum, "Versatility")));

        return table;
    }

    create_mini_radar_row(crit, haste, mastery, vers, dps, size, zoom, dps_gain_mantissa = 1) {
        let cap = 70;
        let secondary_string = [crit, haste, mastery, vers].join("_");
        let abs_dps = this.bm_chart_data.data[this.bm_chart_data.selected_data_key][secondary_string];
        let rel_dps = this.bm_chart_data.get_relative_gain(abs_dps, dps) + 100.0;

        let row = document.createElement("div");
        row.style.display = "table-row";

        let svg_container = document.createElement("div");
        svg_container.style.display = "table-cell";
        svg_container.appendChild(this.create_radar_chart(crit, haste, mastery, vers, dps, false, false, size, zoom));
        row.appendChild(svg_container);

        // add svg name as tooltip to capped value-rows
        if (secondary_string.indexOf(cap) !== -1) {
            let description = document.createElement("div");
            let text = "Critical Strike";
            if (haste === cap) {
                text = "Haste";
            } else if (mastery === cap) {
                text = "Mastery";
            } else if (vers === cap) {
                text = "Versatility";
            }

            description.appendChild(document.createTextNode(text));
            svg_container.setAttribute("data-bm-tooltip-text", description.outerHTML);
            svg_container.setAttribute("data-bm-tooltip-placement", "left");
            svg_container.setAttribute("data-type", "bm-tooltip");
        }


        let value = document.createElement("div");
        value.textContent = this.bm_chart_data.convert_number_to_local(rel_dps, dps_gain_mantissa);
        value.classList.add("bm-radar-mini-table-value");
        row.appendChild(value);

        value.appendChild(BmUIUtils.createUnitTextNode(this.bm_chart_data.unit["relative"]));

        // add dps as tooltip
        let container = document.createElement("div");
        container.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(abs_dps, 0)));
        container.appendChild(BmUIUtils.createUnitTextNode("dps"));

        value.setAttribute("data-bm-tooltip-text", container.outerHTML);
        value.setAttribute("data-bm-tooltip-placement", "right");
        value.setAttribute("data-type", "bm-tooltip");

        return row;
    }

    create_main_radar(crit, haste, mastery, vers, dps, size) {
        let floater = document.createElement("div");
        floater.classList.add("bm-radar-main-radar");

        let radar = this.create_radar_chart(crit, haste, mastery, vers, dps, true, false, size);
        floater.appendChild(radar);

        return floater;
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
        let max_value = size / 2;
        let background_circles = [max_value * 0.6, max_value * 0.4, max_value * 0.2];
        let cross_max = max_value / 5 * 4;
        let legend_space = max_value / 10;

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        // svg.setAttribute("height", size * zoom);
        // svg.setAttribute("width", size * zoom);
        svg.style.minWidth = "45px";
        // svg.style.maxWidth = "100px";
        svg.style.maxWidth = "365px";
        svg.style.margin = "auto";
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

        // background
        /// radar
        for (let r of background_circles) {
            let outer_circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            outer_circle.setAttribute("cx", size / 2);
            outer_circle.setAttribute("cy", size / 2);
            outer_circle.setAttribute("r", r);
            outer_circle.setAttribute("class", "bm-radar-background");
            svg.appendChild(outer_circle);
        }
        /// cross
        let horizontal = document.createElementNS("http://www.w3.org/2000/svg", "line");
        horizontal.setAttribute("x1", size / 2 - cross_max);
        horizontal.setAttribute("y1", size / 2);
        horizontal.setAttribute("x2", size / 2 + cross_max);
        horizontal.setAttribute("y2", size / 2);
        horizontal.setAttribute("class", "bm-radar-background");
        svg.appendChild(horizontal);

        let vertical = document.createElementNS("http://www.w3.org/2000/svg", "line");
        vertical.setAttribute("x1", size / 2);
        vertical.setAttribute("y1", size / 2 - cross_max);
        vertical.setAttribute("x2", size / 2);
        vertical.setAttribute("y2", size / 2 + cross_max);
        vertical.setAttribute("class", "bm-radar-background");
        svg.appendChild(vertical);

        /// legend
        if (show_legend === true) {
            let svg_crit = document.createElementNS("http://www.w3.org/2000/svg", "text");
            svg_crit.textContent = "Critical Strike";
            svg_crit.setAttribute("x", size / 2);
            svg_crit.setAttribute("y", size / 2);
            svg_crit.setAttribute("transform", `rotate(-90 ${size / 2},${size / 2}) translate(0 ${-((size / 2) - legend_space)})`);
            svg_crit.setAttribute("class", "bm-radar-legend");
            svg_crit.setAttribute("dominant-baseline", "central");
            svg.appendChild(svg_crit);

            let svg_haste = document.createElementNS("http://www.w3.org/2000/svg", "text");
            svg_haste.textContent = "Haste";
            svg_haste.setAttribute("x", size / 2);
            svg_haste.setAttribute("y", size / 2);
            svg_haste.setAttribute("transform", `translate(0 ${-(size / 2 - legend_space)})`);
            svg_haste.setAttribute("class", "bm-radar-legend");
            svg_haste.setAttribute("dominant-baseline", "central");
            svg.appendChild(svg_haste);

            let svg_mastery = document.createElementNS("http://www.w3.org/2000/svg", "text");
            svg_mastery.textContent = "Mastery";
            svg_mastery.setAttribute("x", size / 2);
            svg_mastery.setAttribute("y", size / 2);
            svg_mastery.setAttribute("transform", `rotate(-90 ${size / 2},${size / 2}) translate(0 ${(size / 2) - legend_space})`);
            svg_mastery.setAttribute("class", "bm-radar-legend");
            svg_mastery.setAttribute("dominant-baseline", "central");
            svg.appendChild(svg_mastery);

            let svg_vers = document.createElementNS("http://www.w3.org/2000/svg", "text");
            svg_vers.textContent = "Versatility";
            svg_vers.setAttribute("x", size / 2);
            svg_vers.setAttribute("y", size / 2);
            svg_vers.setAttribute("transform", `translate(0 ${(size / 2) - legend_space})`);
            svg_vers.setAttribute("class", "bm-radar-legend");
            svg_vers.setAttribute("dominant-baseline", "central");
            svg.appendChild(svg_vers);
        }

        // foreground
        /// object
        let object = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        object.setAttribute("points", `${size / 2 * (1 - crit / 100)},${size / 2} ${size / 2},${size / 2 * (1 - haste / 100)} ${size / 2 * (1 + mastery / 100)},${size / 2} ${size / 2},${size / 2 * (1 + vers / 100)}`);
        object.setAttribute("class", "bm-radar-object");
        svg.appendChild(object);

        /// text 
        if (show_dps === true) {
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = dps.toLocaleString();
            text.setAttribute("x", size / 2);
            text.setAttribute("y", size / 2);
            text.setAttribute("class", "bm-radar-object-value");
            text.setAttribute("dominant-baseline", "central");
            svg.appendChild(text);
        }

        return svg;
    }
}

async function bm_import_charts() {
    console.debug("bm_import_charts called");
    // find bloodmallet_chart class elements
    let chart_anchors = document.querySelectorAll("div.bloodmallet_chart");
    // console.log(chart_anchors);
    const domain = "bloodmallet.com";
    const local = "127.0.0.1:8000";
    const endpoint = `https://${domain}/chart/get`;

    for (const chart_anchor of chart_anchors) {

        // set language if language information is missing from chart and language cookie was set
        if (!chart_anchor.dataset.language && (
            location.hostname == domain || location.hostname == local
        ) && ('; ' + document.cookie).indexOf("; django_language=") > -1) {
            // https://stackoverflow.com/a/59603055/8002464
            let language = ('; ' + document.cookie).split(`; django_language=`).pop().split(';')[0];
            chart_anchor.dataset.language = language;
        }

        if (chart_anchor.dataset.loadedData) {
            // create BmChartData from element
            try {
                let bm_data = new BmChartData(chart_anchor);
                // get chart type from loaded data
                let chart = BmBarChart;
                if (bm_data.data_type === "secondary_distributions") {
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

        if (chart_anchor.dataset.hasOwnProperty("chartId")) {
            console.debug(`Chart has chartId:`, chart_anchor.dataset.chartId);
            // if chart_id -> load id
            let chart_id = chart_anchor.dataset?.chartId;
            // console.log("Identified chart id:", chart_id);
            request_endpoint = endpoint + "/" + chart_id;
        } else if ("wowClass" in chart_anchor.dataset && "wowSpec" in chart_anchor.dataset &&
            chart_anchor.dataset.wowClass && chart_anchor.dataset.wowSpec) {
            let wow_class = chart_anchor.dataset.wowClass;
            let wow_spec = chart_anchor.dataset.wowSpec;
            chart_type = chart_anchor.dataset.type || "trinkets";
            fight_style = chart_anchor.dataset.fightStyle || "castingpatchwerk";

            // console.log("Identified chart_import for standard", chart_type, "chart of fight_style", fight_style, "for", wow_spec, wow_class);
            request_endpoint = [endpoint, chart_type, fight_style, wow_class, wow_spec].join("/");
        } else if ("type" in chart_anchor.dataset && chart_anchor.dataset.type === "trinket_compare") {
            // Handle trinket_compare
            item_name = chart_anchor.dataset.itemName;
            item_level = chart_anchor.dataset.itemLevel;
            chart_type = chart_anchor.dataset.type;
            fight_style = chart_anchor.dataset.fightStyle || "castingpatchwerk";
            request_endpoint = [endpoint, chart_type, fight_style, item_name, item_level].join("/");
        }
        // console.log("bloodmallet.com: loading chart from", request_endpoint);
        try {
            let data;
            if (chart_type === "trinket_compare") {
                data = await getTrinketDataAsync(item_name, item_level, fight_style);
            } else {
                const response = await fetch(request_endpoint);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
            }

            chart_anchor.dataset.loadedData = JSON.stringify(data);
            let bm_data = new BmChartData(chart_anchor);

            let chart;
            switch (bm_data.data_type) {
                case "secondary_distributions":
                    chart = BmRadarChart;
                    break;
                case "power_infusion":
                case "trinket_compare":
                default:
                    chart = BmBarChart;
            }

            new chart(bm_data);

        } catch (error) {
            console.error("Error fetching or processing data:", error);
        }
    }
}

async function updateTrinketChartAsync(state) {
    const charts = document.querySelectorAll("div.bloodmallet_chart");
    const chart_anchor = charts[0];

    try {
        const data = await getTrinketDataAsync(state.item_name, state.item_level, state.fight_style);

        chart_anchor.dataset.loadedData = JSON.stringify(data);
        let bm_data = new BmChartData(chart_anchor);
        new BmBarChart(bm_data);

    } catch (error) {
        console.error("Error updating trinket chart:", error);
    }
}

window.updateTrinketChartAsync = updateTrinketChartAsync;

// Load data on document load
document.addEventListener("DOMContentLoaded", function () {
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
            "en_US": "www",
            "cn_CN": "cn",
            "de_DE": "de",
            "es_ES": "es",
            "fr_FR": "fr",
            "it_IT": "it",
            "ko_KR": "ko",
            "pt_BR": "pt",
            "ru_RU": "ru"
        };

        return subdomains[language] || "www";
    }

    /**
     * Get language from Django cookie 
     * @returns {string|null} Language code or null if not found
     */
    static getLanguageFromCookie = () => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const trimmedCookie = cookie.trim();
            if (trimmedCookie.startsWith('django_language=')) {
                return trimmedCookie.split('=')[1];
            }
        }
        return null;
    };

    /**
     * Get language from dataset attribute
     * @param {HTMLElement} element The element to check for language attribute
     * @returns {string|null} Language code or null if not found
     */
    static getLanguageFromDataset = (element) => {
        return element?.dataset?.language || null;
    };

    /**
     * Get language from browser settings
     * @returns {string|null} Language code or null if not found
     */
    static getLanguageFromBrowser = () => {
        return navigator.language ? navigator.language.split('-')[0] : null;
    };

    /**
     * Convert language code to full form if needed
     * @param {string} langCode The language code to convert
     * @returns {string} The full language code
     */
    static normalizeLanguageCode = (langCode) => {
        /**
         * Language mapping from short to long form
         */
        const languageMap = {
            "cn": "cn_CN",
            "en": "en_US",
            "de": "de_DE",
            "es": "es_ES",
            "fr": "fr_FR",
            "it": "it_IT",
            "ko": "ko_KR",
            "pt": "pt_BR",
            "ru": "ru_RU",
            "zh-hans": "cn_CN"
        };

        return languageMap[langCode] || langCode;
    };

    /**
     * Detects the user's language from element, cookies or browser settings
     * @param {HTMLElement} element Optional element to check for language attribute
     * @returns {string} The full language code (e.g., "en_US")
     */
    static detectUserLanguage = (element = null) => {
        let langCode = getLanguageFromDataset(element) || getLanguageFromCookie() || getLanguageFromBrowser();
        return normalizeLanguageCode(langCode || "en_US");
    };

    /**
     * Format types for text processing
     * @readonly
     * @enum {string}
     */
    static FormatTypes = Object.freeze({
        SLUG: "slug",
        ITEM_LEVEL: "item_level",
        FIGHT_STYLE: "fight_style",
        ITEM_NAME: "item_name",
    });

    /**
     * Formats text based on the specified type
     * @param {string} text The text to format
     * @param {FormatTypes} type The type of formatting to apply (e.g., "SLUG", "FIGHT_STYLE")
     * @returns {string} The formatted text
     */
    static formatText = (text, type) => {
        if (!text) return "Loading...";

        switch (type) {
            case FormatTypes.SLUG:
                return text.replaceAll(" ", "_").toLowerCase();
            case FormatTypes.ITEM_LEVEL:
                return text;
            case FormatTypes.FIGHT_STYLE:
                const fightStyles = {
                    "castingpatchwerk": "Casting Patchwerk 1 target",
                    "castingpatchwerk3": "Casting Patchwerk 3 targets",
                    "castingpatchwerk5": "Casting Patchwerk 5 targets",
                };

                return fightStyles[text] || text;
            case FormatTypes.ITEM_NAME:
                return text.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
            default:
                return text;
        }
    };

    /**
     * Format a number for display with proper locale formatting
     * 
     * @param {number} value - The number to format
     * @param {number} mantissa - Number of decimal places (default: 2)
     * @returns {string} Formatted number string
     */
    static formatNumber(value, mantissa = 2) {
        const roundedValue = Math.round((value + Number.EPSILON) * (10 ** mantissa)) / (10 ** mantissa);
        return roundedValue.toLocaleString(undefined, {
            minimumFractionDigits: mantissa,
            maximumFractionDigits: mantissa
        });
    }

    /**
     * Capitalizes all first letters in a string, preserving underscores
     * Example: string_test -> String_Test
     * @param {string} string The string to capitalize
     * @returns {string} The capitalized string
     */
    static capitalizeFirstLetters = (string) => {
        if (!string) return "";

        let newString = string.charAt(0).toUpperCase();
        if (string.includes("_")) {
            newString += string.slice(1, string.indexOf("_") + 1);
            newString += capitalizeFirstLetters(string.slice(string.indexOf("_") + 1));
        } else {
            newString += string.slice(1);
        }
        return newString;
    };

    /**
     * Creates a unit text node with the appropriate styling
     * @param {string} unit The unit to display (e.g., "%")
     * @returns {HTMLSpanElement} A span element containing the unit
     */
    static createUnitTextNode = (unit) => {
        const span = document.createElement("span");
        span.classList.add("bm-unit");
        span.appendChild(document.createTextNode(unit));
        return span;
    };

    /**
     * Creates a DOM element with specified attributes and children
     * 
     * @param {string} tag - The HTML tag name
     * @param {Object} attributes - Element attributes and properties
     * @param {Array} children - Element children (strings or nodes)
     * @returns {HTMLElement} The created element
     */
    static createElement = (tag, attributes = {}, children = []) => {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerText') {
                element.innerText = value;
            } else if (key === 'events') {
                Object.entries(value).forEach(([event, handler]) => {
                    element.addEventListener(event, handler);
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    }

    /**
     * Safely parse JSON with error handling
     * 
     * @param {string} jsonString - JSON string to parse
     * @param {*} defaultValue - Default value to return if parsing fails
     * @returns {Object} Parsed object or default value
     */
    static safeJsonParse = (jsonString, defaultValue = null) => {
        if (!jsonString) return defaultValue;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return defaultValue;
        }
    }

    /**
     * Get chart data from a chart element
     * @param {HTMLElement} chart - Chart element
     * @returns {Object|null} Chart data or null if not available
     */
    static getChartData = (chart) => {
        if (!chart || !chart.dataset.loadedData) return null;
        return safeJsonParse(chart.dataset.loadedData);
    }
}
