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
     * Name of the super-key to filter data to the relevant set for multi-char simulations
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
        "absolute": ""
    };
    x_axis_texts = {
        "total": "damage per second",
        "relative": "% damage per second",
        "absolute": "damage per second"
    };

    wow_spec = "";
    wow_class = "";
    secondary_sum = -1;

    enable_title = true;
    enable_subtitle = true;
    enable_simc_subtitle = true;
    enable_tooltips = true;

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

        this._extract_data_from_loaded_data("element_id", ["element_id"]);
        this._extract_data_from_loaded_data("title", ["data_type"]);
        this._set_subtitle();
        this._extract_data_from_loaded_data("simc_hash", ["metadata", "SimulationCraft"]);
        this.legend_title = "Itemlevels";
        this._extract_data_from_loaded_data("legend_title", ["legend_title"]);
        this._extract_data_from_loaded_data("data", ["data"]);
        this._extract_setting_from_root_element("value_calculation", "valueCalculation");
        this._extract_setting_from_root_element("selected_data_key", "selectedDataKey");

        this.x_axis_title = this.x_axis_texts[this.value_calculation];
        this._extract_data_from_loaded_data("x_axis_title", ["x_axis_title"]);
        this._extract_data_from_loaded_data("y_axis_title", ["y_axis_title"]);
        this._extract_data_from_loaded_data("wow_spec", ["profile", "character", "spec"]);
        this._extract_data_from_loaded_data("wow_class", ["profile", "character", "class"]);
        this._extract_data_from_loaded_data("secondary_sum", ["secondary_sum"]);

        // optional
        // TODO: Continue here to transform data extraction to use extract_data_from_loaded_data and extract_setting_from_root_element if appropriate
        this._extract_data_from_loaded_data("series_names", ["simulated_steps"]);
        if (this.series_names.length === 0) {
            for (let key_value_object of Object.values(this.data)) {
                for (let series of Object.keys(key_value_object)) {
                    if (this.series_names.indexOf(series) === -1) {
                        this.series_names.push(series);
                    }
                }
            }
        }
        this.series_names.sort();
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
            console.log("No base_values found");
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
            throw "base_value must be an empty object, have only one key, or the same length and keys as series_names.";
        }

        // optional: language_dict
        this._extract_data_from_loaded_data("language_dict", ["translations"]);
        this._extract_data_from_loaded_data("item_id_dict", ["item_ids"]);
        this._extract_data_from_loaded_data("spell_id_dict", ["spell_ids"]);
        this._extract_data_from_loaded_data("language", ["language"]);
        this._extract_setting_from_root_element("enable_title", "enableTitle", this._convert_to_bool);
        this._extract_setting_from_root_element("enable_subtitle", "enableSubtitle", this._convert_to_bool);
        this._extract_setting_from_root_element("enable_simc_subtitle", "enableSimcSubtitle", this._convert_to_bool);
        this._extract_setting_from_root_element("enable_tooltips", "enableTooltips", this._convert_to_bool);

        this.global_max_value = Math.max(...Object.values(this.data).map(element => Math.max(...Object.values(element))));
        // delete this.data.baseline;

        // this.create_chart();

        // $(function () {
        //     $('[data-toggle="tooltip"]').tooltip()
        // })
        // try {
        //     $WowheadPower.refreshLinks();
        // } catch (error) {
        //     console.error("Error occured while trying to refresh WowheadPower links.");
        //     console.error(error);
        // }
        // add_bm_tooltips_to_dom();
        // bm_add_css(BmChartStyleId, BmChartStyleUrl);
    }

    _convert_to_bool(input) {
        return input.toLowerCase() === 'true'
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
     * E.g. changed_value=80, base_value=100 => -20
     * @param {Number} changed_value 
     * @param {Number} base_value 
     * @returns {Number}
     */
    get_relative_gain(changed_value, base_value) {
        let relative_gain = this._get_relative_value(changed_value, base_value);
        return relative_gain - 100.0;
    }

    get_absolute_gain(changed_value, base_value) {
        let value = changed_value - base_value;
        return value > 0 ? value : 0;
    }

    get_translated_name(key) {
        if (key in this.language_dict && this.language in this.language_dict[key]) {
            return this.language_dict[key][this.language];
        } else {
            return key;
        }
    }

    _get_wowhead_url(key) {
        let base = "https://www.wowhead.com/";
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

    get_wowhead_link(key) {
        let translated_name = document.createTextNode(this.get_translated_name(key));
        let url = this._get_wowhead_url(key);
        if (url === undefined) {
            return translated_name;
        }
        let link = document.createElement("a");
        link.href = url;
        link.appendChild(translated_name);
        return link;
    }

    get_value(key, series, value_calculation) {
        if (value_calculation === "total") {
            return this.data[key][series];
        } else if (value_calculation === "absolute") {
            return this.get_absolute_gain(this.data[key][series], this.base_values[series]);
        } else if (value_calculation === "relative") {
            return this.get_relative_gain(this.data[key][series], this.base_values[series]);
        }
    }

    /**
     * 
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
        let root = this.bm_chart_data.root_element;
        root.classList.add("bm-bar-chart");

        this.bm_chart_data.add_title(root);
        this.bm_chart_data.add_subtitle(root);
        this.bm_chart_data.add_simc_subtitle(root);

        // axis titles
        let axis_titles = document.createElement("div");
        axis_titles.classList.add("bm-row");
        let key_title = document.createElement("div");
        key_title.classList.add("bm-key-title");
        // key_title.appendChild(document.createTextNode(this.y_axis_title));
        axis_titles.appendChild(key_title);
        let bar_title = document.createElement("div");
        bar_title.classList.add("bm-bar-title");
        // bar start
        if (["absolute", "relative"].indexOf(this.bm_chart_data.value_calculation) > -1) {
            let min = document.createElement("span");
            min.classList.add("bm-bar-min")

            let unit = create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]);

            if (this.bm_chart_data.value_calculation === "absolute") {
                min.appendChild(unit);
                min.appendChild(document.createTextNode(0));
            } else if (this.bm_chart_data.value_calculation === "relative") {
                min.appendChild(document.createTextNode(0));
                min.appendChild(unit);
            }

            bar_title.appendChild(min);
        }
        bar_title.appendChild(document.createTextNode(this.bm_chart_data.x_axis_title));
        // bar end
        if (["absolute", "relative"].indexOf(this.bm_chart_data.value_calculation) > -1) {
            let max = document.createElement("span");
            max.classList.add("bm-bar-max")

            let unit = create_unit_textnode(this.bm_chart_data.unit[this.bm_chart_data.value_calculation]);

            let base_value = this.bm_chart_data.base_values[this.bm_chart_data.series_names[this.bm_chart_data.series_names.length - 1]];
            if (this.bm_chart_data.value_calculation === "absolute") {
                max.appendChild(unit);
                max.appendChild(document.createTextNode(this.bm_chart_data.get_absolute_gain(this.bm_chart_data.global_max_value, base_value)));
            } else if (this.bm_chart_data.value_calculation === "relative") {
                max.appendChild(document.createTextNode(this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_relative_gain(this.bm_chart_data.global_max_value, base_value))));
                max.appendChild(unit);
            }

            bar_title.appendChild(max);
        }
        axis_titles.appendChild(bar_title);
        root.appendChild(axis_titles);

        // actual data / bars
        for (let key of this.bm_chart_data.sorted_data_keys) {
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
            for (let [index, series] of this.bm_chart_data.series_names.entries()) {
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
                if (index === this.bm_chart_data.series_names.length - 1) {
                    let final_stack_value = document.createElement("span");
                    final_stack_value.classList.add("bm-bar-final-value");
                    final_stack_value.appendChild(document.createTextNode(this.bm_chart_data.get_value(key, series, this.bm_chart_data.value_calculation)));
                    bar_part.appendChild(final_stack_value);
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
            this.bm_chart_data.add_tooltip(bar, this.create_tooltip(key), "left");

            row.appendChild(bar);
            root.appendChild(row);
        }

        // legend
        let legend = document.createElement("div");
        legend.classList.add("bm-legend");
        let legend_title = document.createElement("div");
        legend_title.classList.add("bm-legend-title");
        legend_title.appendChild(document.createTextNode(this.bm_chart_data.legend_title));
        legend.appendChild(legend_title);
        let legend_items = document.createElement("div");
        legend_items.classList.add("bm-legend-items");
        for (let [index, series] of this.bm_chart_data.series_names.entries()) {
            let legend_series = document.createElement("div");
            legend_series.classList.add("bm-legend-item", "bm-bar-group-" + (index + 1));
            legend_series.appendChild(document.createTextNode(series));
            legend_items.appendChild(legend_series);
            // required to space the legend items
            legend_items.appendChild(document.createTextNode(" "));
        }
        legend.appendChild(legend_items);
        root.appendChild(legend)
    }

    create_tooltip(key) {
        let container = document.createElement("div");
        container.classList.add("bm-tooltip-container");

        let title = document.createElement("div");
        title.classList.add("bm-tooltip-title");
        let translated_name = this.bm_chart_data.get_translated_name(key);
        title.appendChild(document.createTextNode(translated_name));
        container.appendChild(title);

        let series_names = this.bm_chart_data.series_names.slice();
        let bm_bar_group_classes = [];
        for (let i = 1; i <= series_names.length; i++) {
            bm_bar_group_classes.push("bm-bar-group-" + i);
        }

        let reverse = true;
        if (reverse) {
            series_names = series_names.reverse();
            bm_bar_group_classes = bm_bar_group_classes.reverse();
        }

        // inverse sort to have the table start with the highest value
        for (let [index, series] of series_names.entries()) {
            if (!this.bm_chart_data.data[key].hasOwnProperty(series)) {
                // data doesn't have series element, skipping
                continue;
            }
            let row = document.createElement("div");
            row.classList.add("bm-tooltip-row");

            let key_div = document.createElement("div");
            // TODO: Index for colour is wrong because the series was inverted
            key_div.classList.add("bm-tooltip-key", bm_bar_group_classes[index]);
            key_div.appendChild(document.createTextNode(series));
            row.appendChild(key_div);

            let value_div = document.createElement("div");
            value_div.classList.add("bm-tooltip-value");
            let value = this.bm_chart_data.convert_number_to_local(this.bm_chart_data.get_value(key, series, this.bm_chart_data.value_calculation));
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
