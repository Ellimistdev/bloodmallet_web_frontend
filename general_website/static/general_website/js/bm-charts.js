const BmChartStyleId = "bm-chart-styles";
const BmChartStyleUrl = "/static/general_website/css/bm-charts.css";
const BmTooltipJsId = "bm-tooltip-javascript";
const BmTooltipJsUrl = "/static/general_website/js/bm-tooltips.js";

/**
 * Inject css into head
 * @param {String} id id of the styles element in the website
 * @param {String} url url to the styles
 * @returns Nothing
*/
function bm_add_css(id, url) {
    if (document.getElementById(id)) {
        return;
    }

    let styles = document.createElement("link");
    styles.id = id;
    styles.rel = "stylesheet";
    styles.type = "text/css";
    styles.href = url + "?now=" + Date.now();
    styles.media = "all";
    document.getElementsByTagName('head')[0].appendChild(styles);
}

/**
 * Add bloodmallet tooltip js to page and execute `bm_register_tooltips`.
*/
function add_bm_tooltips_to_dom() {
    if (!document.getElementById(BmTooltipJsId)) {
        let js = document.createElement("script");
        js.id = BmTooltipJsId;
        js.type = "text/javascript";
        js.src = BmTooltipJsUrl + "?now=" + Date.now();
        document.getElementsByTagName('head')[0].appendChild(js);
    }

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
 * Create span with unit with applied bm-unit class
 * @param {String} unit e.g. %
 * @returns span
 */
function create_unit_textnode(unit) {
    let span = document.createElement("span");
    span.classList.add("bm-unit");
    span.appendChild(document.createTextNode(unit));

    return span;
}

/**
 * On creation class gets handed an html element containing all data and 
 * settings required for the generation of a BmChart. Class collects
 * configs and offers them in a single location with auto-complete.
*/
class BmChartData {
    /**
     * @type {HTMLElement}
     */
    root_element;

    /**
     * loaded data from the backend
     */
    loaded_data = {};

    // data extracted from loaded_data
    /**
     * e.g. "Trinkets | Elemental Shaman | Castinpatchwerk"
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

    // settings
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

    // calculated values based on `data`
    /**
     * max dps value found in `data`
     */
    global_max_value = -1;

    // statics
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
        // "talent_target_scaling": {
        //     "value_calculation": "total"
        // }
        "weapon_enchantments": {
            "value_calculation": "relative"
        }
    };

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

    enable_title = true;
    enable_subtitle = true;
    enable_simc_subtitle = true;
    enable_tooltips = true;
    enable_legend = false;
    enable_end_of_bar_values = false;

    /**
     * Extract the value from `key_chain` of `loaded_data` and stores it in class as `property`.
     * @param {String} property name of the property to be set on this class
     * @param {Array<String>} key_chain nested keys in loaded_data to get the value for `property`
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
     * @param {String} property name of the proeprty to be set on this class
     * @param {String} key name of the dataset key containing the wanted value
     * @param {CallableFunction} converter converter({String}): String 
     */
    _extract_setting_from_root_element(property, key, converter = (v) => { return v }) {
        if (this.root_element.dataset.hasOwnProperty(key)) {
            this[property] = converter(this.root_element.dataset[key]);
        }
    }

    /**
     * Set `property` of BmChartData to to a data_type appropriate default, if present.
     * @param {String} property a BmChartData property that might or might not be part of data_type_defaults
     */
    _set_default_from_data_type(property) {
        if (this.data_type_defaults.hasOwnProperty(this.data_type) && this.data_type_defaults[this.data_type].hasOwnProperty(property)) {
            this[property] = this.data_type_defaults[this.data_type][property];
        }
    }

    _set_subtitle() {
        let subtitle = this.loaded_data["profile"]["character"]["spec"] + " " + this.loaded_data["profile"]["character"]["class"];
        subtitle += " | " + this.loaded_data["simc_settings"]["fight_style"];
        subtitle += " | UTC " + this.loaded_data["metadata"]["timestamp"];

        this.subtitle = subtitle;
    }

    /**
     * Add title to `element`
     * @param {HTMLElement} element root element
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
     * Add subtitle to `element`
     * @param {HTMLElement} element root element
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
     * Add simc subtitle to `element`
     * @param {HTMLElement} element root element
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


    constructor(root_element = new HTMLElement()) {
        /**
         * Contains the root html element. Data was extracted from it.
         */
        this.root_element = root_element;

        if (!this.root_element.dataset.hasOwnProperty("loadedData")) {
            throw new Error("Data musst be loaded in Element before attempting to create the associated chart.");
        }

        this.loaded_data = JSON.parse(this.root_element.dataset.loadedData);

        this._extract_data_from_loaded_data("data_type", ["data_type"]);
        this._extract_data_from_loaded_data("element_id", ["element_id"]);
        this._extract_data_from_loaded_data("title", ["data_type"]);
        this._set_subtitle();
        this._extract_data_from_loaded_data("simc_hash", ["metadata", "SimulationCraft"]);
        if (this.data_type === "races") {
            this.legend_title = "Race";
        } else if (this.data_type === "trinkets") {
            this.legend_title = "Itemlevels";
        } else if (["phials", "potions", "weapon_enchantments"].includes(this.data_type)) {
            this.legend_title = "Ranks";
        } else if (this.data_type === "talent_target_scaling") {
            this.legend_title = "Targets";
        } else {
            this.legend_title = "legend_title not set";
        }
        this._extract_data_from_loaded_data("legend_title", ["legend_title"]);
        this._extract_data_from_loaded_data("data", ["data"]);
        this._set_default_from_data_type("value_calculation");
        this._extract_setting_from_root_element("value_calculation", "valueCalculation");
        this._extract_setting_from_root_element("selected_data_key", "selectedDataKey");

        this.x_axis_title = this.x_axis_texts[this.value_calculation];
        this._extract_data_from_loaded_data("x_axis_title", ["x_axis_title"]);
        this._extract_data_from_loaded_data("y_axis_title", ["y_axis_title"]);
        this._extract_data_from_loaded_data("wow_spec", ["profile", "character", "spec"]);
        this._extract_data_from_loaded_data("wow_class", ["profile", "character", "class"]);
        this._extract_data_from_loaded_data("secondary_sum", ["secondary_sum"]);

        // optional
        this._extract_data_from_loaded_data("series_names", ["simulated_steps"]);
        if (this.series_names.length === 0) {
            for (let key_value_object of Object.values(this.data)) {
                for (let series of Object.keys(key_value_object)) {
                    let parsed_int = Number.parseInt(series);
                    if (this.series_names.indexOf(parsed_int) === -1 && parsed_int.toString() === series) {
                        // series are numbers, e.g. itemlevels or ranks
                        this.series_names.push(parsed_int);
                    } else if (this.series_names.indexOf(series) === -1 && parsed_int.toString() !== series) {
                        // series are words, e.g. like 10_10_10_70 from secondary distribution charts
                        this.series_names.push(series);
                    }
                }
            }
        }
        this.series_names.sort((a, b) => a - b);

        // optional
        this._extract_data_from_loaded_data("sorted_data_keys", ["sorted_data_keys"])
        if (this.sorted_data_keys.length === 0) {
            let key_value = {};
            for (let key of Object.keys(this.data)) {
                key_value[key] = Math.max(...Object.values(this.data[key]));
            }
            this.sorted_data_keys = Object.keys(key_value).sort((a, b) => key_value[b] - key_value[a]);
        }
        this._extract_data_from_loaded_data("sorted_data_data_keys", ["sorted_data_keys"]);

        // optional - base_values
        // create if no keys
        // extend if number of keys === 1 and number of series_names > 1
        this._extract_data_from_loaded_data("base_values", ["data", "baseline"]);
        if (Object.keys(this.base_values).length === 0) {
            // console.log("No base_values found");
            for (let series of this.series_names) {
                // we assume 0 dps to be the baseline
                this.base_values[series] = 0;
            }
        } else if (Object.keys(this.base_values).length === 1 && this.series_names.length > 1) {
            // console.log("1 base_values found but multiple series_names");
            let tmp_value = Object.values(this.base_values)[0];
            for (let series of this.series_names) {
                // we assume 0 dps to be the baseline
                this.base_values[series] = tmp_value;
            }
        } else if (Object.keys(this.base_values).length == this.series_names.length) {
            // console.log("as many base_values found as series_names");
            // do nothing
        } else {
            throw "base_value must be an empty object, have only one key, or the same length and keys as series_names." + this.data_type;
        }

        // optional
        this._extract_data_from_loaded_data("language_dict", ["translations"]);
        this._extract_data_from_loaded_data("item_id_dict", ["item_ids"]);
        this._extract_data_from_loaded_data("spell_id_dict", ["spell_ids"]);
        this._extract_setting_from_root_element("language", "language");
        this._extract_setting_from_root_element("show_top", "showTop", this._convert_to_number);
        this._extract_setting_from_root_element("filter_trinket_itemlevels", "filterTrinketItemlevels", this._convert_to_number_list);
        this._extract_setting_from_root_element("filter_trinket_sources", "filterTrinketSources", this._convert_to_string_list);
        this._extract_setting_from_root_element("filter_trinket_active_passive", "filterTrinketActivePassive", this._convert_to_string_list);
        this._extract_setting_from_root_element("enable_title", "enableTitle", this._convert_to_bool);
        this._extract_setting_from_root_element("enable_subtitle", "enableSubtitle", this._convert_to_bool);
        this._extract_setting_from_root_element("enable_simc_subtitle", "enableSimcSubtitle", this._convert_to_bool);
        this._extract_setting_from_root_element("enable_tooltips", "enableTooltips", this._convert_to_bool);
        this._extract_setting_from_root_element("enable_legend", "enableLegend", this._convert_to_bool);

        if (this.data_type === "races") {
            this.global_max_value = Math.max(...Object.values(this.data));
        } else {
            this.global_max_value = Math.max(...Object.values(this.data).map(element => Math.max(...Object.values(element))));
        }
        // delete this.data.baseline;
    }

    _convert_to_bool(input) {
        return input.toLowerCase() === 'true'
    }

    /**
     * 
     * @param {String} input 
     * @returns {Array<String>}
     */
    _convert_to_string_list(input) {
        return input.split(";");
    }

    /**
     * 
     * @param {String} input 
     * @returns {Array<Number>}
     */
    _convert_to_number_list(input) {
        return input.split(";").map((value) => { return Number.parseInt(value); });
    }

    _convert_to_number(input) {
        return Number.parseInt(input);
    }

    /**
     * Convert `value` to a local string with a mantissa of `mantissa`.
     * E.g. 123.567 becomes 123,56 Germany with a set mantissa of 2.
     * @param {Number} value 
     * @param {Number} [mantissa=2]
     * @returns {String}
     */
    convert_number_to_local(value, mantissa = 2) {
        let removed_rounding_errors = Math.round((value + Number.EPSILON) * (10 ** mantissa)) / (10 ** mantissa);
        return removed_rounding_errors.toLocaleString(undefined, { minimumFractionDigits: mantissa, maximumFractionDigits: mantissa });
    }

    _get_relative_value(changed_value, base_value) {
        return changed_value * 100 / base_value;
    }

    /**
     * Returns the relative gain of `changed_number` compared to `base_value`.
     * E.g. changed_value=80, base_value=100 => -20 (%)
     * @param {Number} changed_value 
     * @param {Number} base_value 
     * @returns {Number}
     */
    get_relative_gain(changed_value, base_value) {
        let relative_gain = this._get_relative_value(changed_value, base_value);
        return relative_gain - 100.0;
    }

    /**
     * Calculate the absolute gain of `changed_value` compared to `base_value`.
     * E.g. changed_value = 7 , base_value = 5 , result = 2
     * @param {Number} changed_value 
     * @param {Number} base_value 
     * @returns {Number}
     */
    get_absolute_gain(changed_value, base_value) {
        let value = changed_value - base_value;
        return value > 0 ? value : 0;
    }

    /**
     * Translate `key` using already loaded data.
     * @param {String} key to be translated `key`
     * @returns {String}
     */
    get_translated_name(key) {
        if (key in this.language_dict && this.language in this.language_dict[key]) {
            return this.language_dict[key][this.language];
        } else {
            return key;
        }
    }

    _get_wowhead_url(key) {
        const subdomain = {
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
        let base = "https://" + subdomain[this.language] + ".wowhead.com/";
        if (key in this.spell_id_dict) {
            base += "spell=";
            base += this.spell_id_dict[key];
        } else if (key in this.item_id_dict) {
            base += "item=";
            base += this.item_id_dict[key];
        } else {
            return undefined;
        }
        return base;
    }

    /**
     * Shorten name but keeping special name addition.
     * @param {String} name 
     * @returns {String}
     */
    _shorten_name(name) {
        if (name.length < 20) {
            return name;
        }
        // might need to remove this
        if (!name.includes("[")) {
            return name;
        }
        let to_be_shortened = name.split("[")[0];
        to_be_shortened = to_be_shortened.trim();
        let specifier = name.split("[")[1];
        specifier = specifier.split("]")[0];
        let name_sections = to_be_shortened.split(":");
        let name_section_parts = [];
        for (const name_section of name_sections) {
            name_section_parts.push(name_section.trim().split(" ").map((part) => part[0]));
        }

        let new_name = "";
        // console.log(name_section_parts);
        for (const characters of name_section_parts) {
            // console.log(characters);
            if (new_name !== "") {
                new_name += ":";
            }
            new_name += characters.join("");
        }
        new_name += " [" + specifier + "]";

        return new_name
    }

    /**
     * Get a wowhead link for `key`
     * @param {String} key base (english) name
     * @returns {HTMLElement} translated link with tooltip-information
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
     * Get the dps value of `key` & `series` using `value_calculation`.
     * @param {String} key key to find the data (dps) object
     * @param {String} series key to find the actual dps value of the object
     * @param {String} value_calculation enum like string to determine how the value should get calculated
     * @returns {Number} dps value
     */
    get_value(key, series, value_calculation) {
        if (value_calculation === "total") {
            return this.data[key][series];
        } else if (value_calculation === "absolute") {
            return this.get_absolute_gain(this.data[key][series], this.base_values[series]);
        } else if (value_calculation === "relative") {
            // special case for augmentatione vokers to compare the gain to 
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
     * Add a bm-tooltip to `element` showing `tooltip` in `position`.
     * @param {HTMLElement} element element gets a tooltip
     * @param {String} tooltip tooltip string, can contain html as string
     * @param {String} position options: left, right, top, bottom
     */
    add_tooltip(element, tooltip, position = "right") {
        if (!this.enable_tooltips) {
            return;
        }
        element.setAttribute("data-type", "bm-tooltip");
        element.setAttribute("data-bm-tooltip-text", tooltip);
        element.setAttribute("data-bm-tooltip-placement", position);
    }

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
     * @type {BmChartData}
     */
    bm_chart_data;

    /**
     * @type {HTMLElement}
     */
    vertical_line;

    constructor(chart_data = new BmChartData()) {
        this.vertical_line = undefined;
        this.bm_chart_data = chart_data;

        this.bm_chart_data.clean_up_root();

        this.create_chart();

        // $(function () {
        //     $('[data-toggle="tooltip"]').tooltip()
        // })
        try {
            $WowheadPower.refreshLinks();
        } catch (error) {
            console.error("Error occured while trying to refresh WowheadPower links.");
            console.error(error);
        }
        add_bm_tooltips_to_dom();
        bm_add_css(BmChartStyleId, BmChartStyleUrl);
    }

    /**
     * 
     * @param {HTMLElement} root_element root element
     * @param {Array<[Number, String]} series_index_names 
     * @returns 
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
            // filter by active part of active_passive
            if (this.bm_chart_data.data_type === "races" && (this.bm_chart_data.filter_trinket_active_passive.includes("active") || this.bm_chart_data.filter_trinket_active_passive.includes("Active"))) {
                return this.bm_chart_data.loaded_data["data_active"][value] === false;
            }
            return true;
        }).filter((value) => {
            // filter by passive part of active_passive
            if (this.bm_chart_data.data_type === "races" && (this.bm_chart_data.filter_trinket_active_passive.includes("passive") || this.bm_chart_data.filter_trinket_active_passive.includes("Passive"))) {
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
        axis_titles.classList.add("bm-row");
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
            let unit = create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]);

            if (this.bm_chart_data.value_calculation === "absolute") {
                min.appendChild(unit);
                min.appendChild(document.createTextNode(0));
            } else if (this.bm_chart_data.value_calculation === "relative") {
                min.appendChild(document.createTextNode(0));
                min.appendChild(unit);
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
            let unit = create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]);

            let base_value = this.bm_chart_data.base_values[this.bm_chart_data.series_names[this.bm_chart_data.series_names.length - 1]];
            if (this.bm_chart_data.value_calculation === "absolute") {
                max.appendChild(unit);
                max.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_absolute_gain(this.bm_chart_data.global_max_value, base_value))));
            } else if (this.bm_chart_data.value_calculation === "relative") {
                let relative_gain = -1;
                if (this.bm_chart_data.wow_class === "evoker" && this.bm_chart_data.wow_spec === "augmentation") {
                    let aug_base_value = this.bm_chart_data.loaded_data["profile"]["metadata"]["base_dps"];
                    let raw_gain = this.bm_chart_data.get_absolute_gain(this.bm_chart_data.global_max_value, base_value);
                    // console.log("augmentation had a raw gain of", raw_gain, "dps compared to its own max dps of", aug_base_value);
                    relative_gain = this.bm_chart_data.get_relative_gain(aug_base_value + raw_gain, aug_base_value);
                } else {
                    relative_gain = this.bm_chart_data.get_relative_gain(this.bm_chart_data.global_max_value, base_value);
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
                                create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation])
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
            let value = this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_value(key, series, this.bm_chart_data.value_calculation));
            if (this.bm_chart_data.value_calculation === "absolute" && this.bm_chart_data.unit[this.bm_chart_data.value_calculation].length > 0) {
                value_div.appendChild(create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]));
            }
            value_div.appendChild(document.createTextNode(value));
            if (this.bm_chart_data.value_calculation === "relative" && this.bm_chart_data.unit[this.bm_chart_data.value_calculation].length > 0) {
                value_div.appendChild(create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]));
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
            if (this.bm_chart_data.unit[this.bm_chart_data.value_calculation].length > 0) {
                value_div.appendChild(create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]));
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
        let box = event.target.getBoundingClientRect();
        // the additional 14-15 px might be left padding of one of the parents? but this is only guess-work
        let left = box.left + window.scrollX + box.width - parent_box.left + 14;

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

        // $(function () {
        //     $('[data-toggle="tooltip"]').tooltip()
        // })
        try {
            $WowheadPower.refreshLinks();
        } catch (error) {
            console.error("Error occured while trying to refresh WowheadPower links.");
            console.error(error);
        }
        add_bm_tooltips_to_dom();
        bm_add_css(BmChartStyleId, BmChartStyleUrl);
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

        table.appendChild(this.create_radar_chart(v_crit, v_haste, v_mastery, v_vers, dps, true, false, size));

        let stacked_overview_table = document.createElement("div");
        stacked_overview_table.style.display = "table";
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

        // header
        let header = document.createElement("div");
        header.classList.add("bm-stat-header");
        table.appendChild(header);

        // let stat = document.createElement("div");
        // stat.classList.add("bm-stat-cell");
        // stat.appendChild(document.createTextNode("Best Distribution"));
        // let distribution = document.createElement("div");
        // distribution.classList.add("bm-stat-cell");
        // distribution.appendChild(document.createTextNode("Ratio"));
        let best_ratio = document.createElement("div");
        best_ratio.classList.add("bm-stat-cell");
        best_ratio.appendChild(document.createTextNode("Best Ratio: " + this.bm_chart_data.convert_number_to_local(dps, 0)));
        best_ratio.appendChild(create_unit_textnode("dps"));
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
                    element.appendChild(create_unit_textnode(suffix));
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

        table.appendChild(add_row("Critical Strike", crit, get_rating(crit, this.bm_chart_data.secondary_sum), get_ingame(crit, this.bm_chart_data.secondary_sum, "Critical Strike")));
        table.appendChild(add_row("Haste", haste, get_rating(haste, this.bm_chart_data.secondary_sum), get_ingame(haste, this.bm_chart_data.secondary_sum, "Haste")));
        table.appendChild(add_row("Mastery", mastery, get_rating(mastery, this.bm_chart_data.secondary_sum), get_ingame(mastery, this.bm_chart_data.secondary_sum, "Mastery")));
        table.appendChild(add_row("Versatility", vers, get_rating(vers, this.bm_chart_data.secondary_sum), get_ingame(vers, this.bm_chart_data.secondary_sum, "Versatility")));

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

        value.appendChild(create_unit_textnode(this.bm_chart_data.unit["relative"]));

        // add dps as tooltip
        let container = document.createElement("div");
        container.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(abs_dps, 0)));
        container.appendChild(create_unit_textnode("dps"));

        value.setAttribute("data-bm-tooltip-text", container.outerHTML);
        value.setAttribute("data-bm-tooltip-placement", "right");
        value.setAttribute("data-type", "bm-tooltip");

        return row;
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
        svg.setAttribute("height", size * zoom);
        svg.setAttribute("width", size * zoom);
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

function bm_import_charts() {
    // find bloodmallet_chart class elements
    let chart_anchors = document.querySelectorAll("div.bloodmallet_chart");
    // console.log(chart_anchors);
    const endpoint = "https://bloodmallet.com/chart/get";

    for (const chart_anchor of chart_anchors) {
        let request_endpoint = undefined;
        if (chart_anchor.dataset.hasOwnProperty("chartId")) {
            // if chart_id -> load id
            let chart_id = chart_anchor.dataset["chartId"];
            // console.log("Identified chart id:", chart_id);
            request_endpoint = endpoint + "/" + chart_id;
        } else if (chart_anchor.dataset.hasOwnProperty("wowClass") && chart_anchor.dataset.hasOwnProperty("wowSpec")) {
            // elif class & spec [& chart type] [& fight style] -> load general data
            let wow_class = chart_anchor.dataset["wowClass"];
            let wow_spec = chart_anchor.dataset["wowSpec"];
            let chart_type = "trinkets";
            if (chart_anchor.dataset.hasOwnProperty("type")) {
                chart_type = chart_anchor.dataset["type"];
            }
            let fight_style = "castingpatchwerk";
            if (chart_anchor.dataset.hasOwnProperty("fightStyle")) {
                fight_style = chart_anchor.dataset["fightStyle"];
            }
            // console.log("Identified chart_import for standard", chart_type, "chart of fight_style", fight_style, "for", wow_spec, wow_class);
            request_endpoint = [endpoint, chart_type, fight_style, wow_class, wow_spec].join("/");
        }
        // console.log(request_endpoint);

        let request = new XMLHttpRequest();
        request.open("GET", request_endpoint, true); // async request
        request.onload = function (e) {
            // console.log(e);
            if (request.readyState === 4) {
                if (request.status === 200) {
                    // store loaded data in html element
                    chart_anchor.dataset.loadedData = request.responseText;
                    // console.log("Added data to ", chart_anchor, "from request", request_endpoint);

                    // create BmChartData from element
                    let bm_data = new BmChartData(chart_anchor);
                    // console.log(bm_data.data_type);
                    // get chart type from loaded data
                    let chart = BmBarChart;
                    if (bm_data.data_type === "secondary_distributions") {
                        // create Chart based on chart type 
                        chart = BmRadarChart;
                    }

                    new chart(bm_data);

                    // let json = JSON.parse(request.responseText);
                    // console.log(json);
                    // console.log("Load and save finished.");
                } else {
                    console.error("Fetching data from", request_endpoint, "received status code", request.status, "and status text:", request.statusText);
                }
            }
        };
        request.onerror = function (e) {
            console.error("Fetching data from bloodmallet.com encountered an error:", e);
        };
        request.send(null);
    }
}
