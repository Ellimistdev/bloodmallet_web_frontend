/******************************************************************************
 * Script to include charts from bloodmallet.com.
 * Linking back to bloodmallet.com as the origin is appreciated.
 * Please consider supporting the project via Patreon or Paypal.
 *
 * https://www.patreon.com/bloodmallet
 * https://www.paypal.me/bloodmallet
 *
 * Requirements:
 *    - Highcharts license on your end (if you're a commercial website)
 *    - include Highcharts scripts before this script
 *
 * The script collects all elements with the class 'bloodmallet_chart'
 *
 * Minimal example of a patchwerk trinket chart for elemental shamans:
 * <div id="unique-id" class="bloodmallet_chart" data-wow-class="shaman" data-wow-spec="elemental"></div>
 *
 * For more information read the wiki at https://github.com/Bloodmallet/bloodmallet_web_frontend/wiki/How-to-import-charts
 *
 */

function bloodmallet_chart_import() {

  /**
   *  Adjust the 'default_' variables to your liking if you host this script yourself.
   *
   */

  /**
   * Variable determines how many bars are visible
   */
  const default_limit = 7;

  /**
   * Options:
   *  wowhead - default
   *  wowdb
   */
  const default_tooltip_engine = "wowhead";

  /**
   * Options:
   *  highcharts - default
   *  highcharts_old
   */
  const default_chart_engine = "highcharts";

  const bar_colors = [
    "#7cb5ec",
    "#d9d9df",
    "#90ed7d",
    "#f7a35c",
    "#8085e9",
    "#f15c80",
    "#e4d354",
    "#2b908f",
    "#f45b5b",
    "#91e8e1"
  ];

  const url_format = "https://bloodmallet.com/chart/get/trinkets/{fight_style}/{wow_class}/{wow_spec}"
  const fight_styles = ["castingpatchwerk", "castingpatchwerk3", "castingpatchwerk5"]
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
  ]

  const default_background_color = "#343a40";
  const default_font_color = "#f8f9fa";
  const default_axis_color = "#828282";

  const font_size = "1.1rem";

  /**
   * options:
   * castingpatchwerk - default
   * castingpatchwerk3
   * castingpatchwerk5
   *  hecticaddcleave
   */
  const default_fight_style = "castingpatchwerk";

  /**
   * options:
   *   - trinkets - default
   *   - races
   *   - conduits
   *   - soul_binds
   *   - legendaries
   *   - domination_shards
   */
  const default_data_type = "trinkets";

  const default_covenant = "Kyrian";

  const default_language = "en";

  /**
   * options:
   *  absolute - default
   *  relative
   */
  const default_value_style = "absolute";

  /******************************************************************************
   * Actual code starts here.
   * The toggles you want are all above this section.
   */

  const debug = false;

  const host = "https://bloodmallet.com";
  const localhost = "http://127.0.0.1:8000";
  const path_to_data = "/chart/get/";

  const language_table = {
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

  const covenants = {
    "Kyrian": {
      "id": 1,
      "color": "#69ccf0"
    },
    "Venthyr": {
      "id": 2,
      "color": "#c41f3b"
    },
    "Night Fae": {
      "id": 3,
      "color": "#a330c9"
    },
    "Necrolord": {
      "id": 4,
      "color": "#abd473"
    }
  };

  /**
   * Conduits have ranks...and those are mapped to itemlevels. Players see their itemlevels ingame, not the rank
   */
  const rank_to_ilevel = {
    1: 145,
    2: 158,
    3: 171,
    4: 184,
    5: 200,
    6: 213,
    7: 226,
    8: 239,
    9: 252,
    10: 265,
    11: 278,
  }

  const domination_shard_colours = {
    "unholy": "#abd473",
    "frost": "#69ccf0",
    "blood": "#c41f3b"
  }

  const absolute_damage_per_second = "\u0394 Damage per second";
  const relative_damage_per_second = "% Damage per second";

  let trinketDataCache = {};
  const TRINKET_DATA_CACHE_KEY = 'trinketData';
  const TRINKET_DATA_CACHE_EXPIRY = 30 * 60 * 1000;  // 30 minutes in milliseconds

  /**
   *
   * Functions
   *
   */

  const fetchDataAsync = async (fightStyle, wowClass, wowSpec) => {
    const url = url_format.replace('{fight_style}', fightStyle)
      .replace('{wow_class}', wowClass)
      .replace('{wow_spec}', wowSpec);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  const processData = (data) => {
    const processedData = {
      items: {},
      metadata: null,
      simcSettings: null,
      subtitle: null,
      timestamp: null
    };

    for (const [className, items] of Object.entries(data)) {
      for (const [itemName, itemLevels] of Object.entries(items.data)) {
        const itemKey = itemName.toLowerCase().replace(" ", "_");
        processedData.items[itemKey] = processedData.items[itemKey] || {};

        // Add translations for the item (only once)
        if (!processedData.items[itemKey].translations) {
          processedData.items[itemKey].translations = items.translations[itemName];
        }

        if (!processedData.items[itemKey].baseline) {
          processedData.items[itemKey].baseline ??= {};
        }

        processedData.items[itemKey].baseline[className] = items.data.baseline;

        for (const [itemLevel, dps] of Object.entries(itemLevels)) {
          processedData.items[itemKey] ??= {};
          processedData.items[itemKey].itemLevels ??= {};
          processedData.items[itemKey].itemLevels[itemLevel] ??= {};
          processedData.items[itemKey].itemLevels[itemLevel][className] = dps;
        }
      }

      processedData.metadata = items.metadata;
      processedData.simcSettings = items.simc_settings;
      processedData.subtitle = items.subtitle;
      processedData.timestamp = items.timestamp;
    }

    return processedData;
  }

  const getTrinketDataAsync = async (itemName, itemLevel, fightStyle) => {
    const data = await fetchAndProcessDataAsync(fightStyle);

    const itemData = data.items[itemName] || {};
    const itemLevelData = itemData.itemLevels[itemLevel] || {};

    const response = {
      data: {
        ...itemLevelData,
        baseline: itemData.baseline,
      },
      translations: itemData.translations,
      metadata: data.metadata,
      simc_settings: data.simcSettings,
      subtitle: data.subtitle,
      timestamp: data.timestamp,
      data_type: "trinket_compare",
    };

    return response;
  }
  
  const fetchAndProcessDataAsync = async (fightStyle) => {
    loadTrinketDataCache();
    const data = {};

    // check cache, if outdated, fetch new data
    const cacheKey = `${fightStyle}`;
    if (trinketDataCache[cacheKey]) {
      return trinketDataCache[cacheKey];
    };

    const promises = specs.map(async ([wowClass, wowSpec, key]) => {
      const response = await fetchDataAsync(fightStyle, wowClass, wowSpec);
      data[key] = response;
    });

    await Promise.all(promises);

    const processedData = processData(data);
    const sortedData = sortData(processedData);

    // update cache
    trinketDataCache[cacheKey] = sortedData;
    localStorage.setItem(TRINKET_DATA_CACHE_KEY, JSON.stringify(trinketDataCache));
    localStorage.setItem(TRINKET_DATA_CACHE_KEY + '_timestamp', Date.now());

    return sortedData;
  }

  const isTrinketDataCacheValid = () => {
    const timestamp = localStorage.getItem(TRINKET_DATA_CACHE_KEY + '_timestamp');
    return timestamp && (Date.now() - parseInt(timestamp, 10)) < TRINKET_DATA_CACHE_EXPIRY;
  }

  const loadTrinketDataCache = () => {
    if (isTrinketDataCacheValid()) {
      trinketDataCache = JSON.parse(localStorage.getItem(TRINKET_DATA_CACHE_KEY)) || {};
    }
  }

  const sortData = (data) => {
    const sortedData = {
      items: {},
      metadata: data.metadata,
      simcSettings: data.simcSettings,
      subtitle: data.subtitle,
      timestamp: data.timestamp
    };

    for (const itemName in data.items) {
      sortedData.items[itemName] ??= {};
      sortedData.items[itemName].itemLevels ??= {};
      sortedData.items[itemName].translations ??= data.items[itemName].translations;
      sortedData.items[itemName].baseline ??= data.items[itemName].baseline;
      for (const itemLevel in data.items[itemName].itemLevels) {
        const sortedSpecs = Object.entries(data.items[itemName].itemLevels[itemLevel])
          .sort((a, b) => b[1] - a[1]);
        sortedData.items[itemName].itemLevels[itemLevel] = Object.fromEntries(sortedSpecs);
      }
    }

    return sortedData;
  }

  /**
   *
   * Initial setup
   *
   */
  this.init_charts = new function () {
    if (debug) {
      console.log("init_charts");
    }
    // scan for divs / what data is wanted
    let chart_list = document.querySelectorAll("div.bloodmallet_chart");

    // check for unique IDs
    let tmp_id_list = [];
    for (let i = 0; i < chart_list.length; i++) {
      const html_element = chart_list[i];
      if (tmp_id_list.indexOf(html_element.id) > -1) {
        console.error("Multiple Elements use the same ID ('" + html_element.id + "'). Aborting bloodmallet_chart_import.js.");
        return;
      } else {
        tmp_id_list.push(html_element.id);
      }
    }

    // collect data per chart
    for (let i = 0; i < chart_list.length; i++) {
      //const html_element = chart_list[i];
      let html_id = undefined;
      try {
        html_id = chart_list[i].id;
      } catch (error) {
        console.error("Each .bloodmallet_chart needs an ID. Aborting bloodmallet_chart_import.js.");
        return;
      }
      const html_element = document.getElementById(chart_list[i].id);

      if (html_element) {

        let state = {
          chart_id: undefined,
          wow_class: undefined,
          wow_spec: undefined,
          item_name: undefined,
          item_level: undefined,
          data_type: default_data_type,
          fight_style: default_fight_style,
          covenant: default_covenant,
          // style
          axis_color: default_axis_color,
          background_color: default_background_color,
          font_color: default_font_color,
          // settings
          limit: default_limit,
          chart_engine: default_chart_engine,
          tooltip_engine: default_tooltip_engine,
          language: default_language,
          value_style: default_value_style,
          talent_target_scaling_min_target_count: -1,
          talent_target_scaling_max_target_count: -1,
          // reminder of the html element
          html_element: html_element
        };

        // Get general settings from in-page variable
        try {
          if (bloodmallet.style.axis_color !== undefined) {
            state.axis_color = bloodmallet.style.axis_color;
          }
          if (bloodmallet.style.background_color !== undefined) {
            state.background_color = bloodmallet.style.background_color;
          }
          if (bloodmallet.style.font_color !== undefined) {
            state.font_color = bloodmallet.style.font_color;
          }
          if (bloodmallet.settings.entries !== undefined) {
            state.limit = bloodmallet.settings.entries;
          }
          if (bloodmallet.settings.chart_engine !== undefined) {
            state.chart_engine = bloodmallet.settings.chart_engine;
          }
          if (bloodmallet.settings.tooltip_engine !== undefined) {
            state.tooltip_engine = bloodmallet.settings.tooltip_engine;
          }
          if (bloodmallet.settings.language !== undefined) {
            state.language = bloodmallet.settings.language;
          }
          if (bloodmallet.settings.value_style !== undefined) {
            state.value_style = bloodmallet.settings.value_style;
          }
        } catch (error) {
          if (debug) {
            console.log("Applying page wide settings failed or no page wide settings were found.");
          }
        }

        // optional input
        if (html_element.getAttribute("data-entries")) {
          state.limit = html_element.getAttribute("data-entries");
        }
        if (html_element.getAttribute("data-fight-style")) {
          state.fight_style = html_element.getAttribute("data-fight-style");
        }
        if (html_element.getAttribute("data-type")) {
          state.data_type = html_element.getAttribute("data-type");
        }
        if (html_element.getAttribute("data-covenant")) {
          state.covenant = html_element.getAttribute("data-covenant");
        }
        if (html_element.getAttribute("data-background-color")) {
          state.background_color = html_element.getAttribute("data-background-color");
        }
        if (html_element.getAttribute("data-font-color")) {
          state.font_color = html_element.getAttribute("data-font-color");
        }
        if (html_element.getAttribute("data-axis-color")) {
          state.axis_color = html_element.getAttribute("data-axis-color");
        }
        if (html_element.getAttribute("data-tooltip-engine")) {
          state.tooltip_engine = html_element.getAttribute("data-tooltip-engine");
        }
        if (html_element.getAttribute("data-chart-engine")) {
          state.chart_engine = html_element.getAttribute("data-chart-engine");
        }
        if (html_element.getAttribute("data-language")) {
          state.language = html_element.getAttribute("data-language");
        }
        if (html_element.getAttribute("data-value-style")) {
          state.value_style = html_element.getAttribute("data-value-style");
        }
        if (html_element.getAttribute("data-talent-target-scaling-min-target-count")) {
          state.talent_target_scaling_min_target_count = parseInt(html_element.getAttribute("data-talent-target-scaling-min-target-count"));
        }
        if (html_element.getAttribute("data-talent-target-scaling-max-target-count")) {
          state.talent_target_scaling_max_target_count = parseInt(html_element.getAttribute("data-talent-target-scaling-max-target-count"));
        }

        // preparing necessary input to load data
        let requirements = true;
        if (!html_element.getAttribute("data-chart-id")) {
          if (!html_element.getAttribute("data-item-name")) {
            if (!html_element.getAttribute("data-wow-class")) {
              console.error("Required 'data-chart-id' or 'data-wow-class' attribute wasn't found in " + html_id + ".")
              requirements = false;
            }
            state.wow_class = html_element.getAttribute("data-wow-class");
            if (!html_element.getAttribute("data-wow-spec")) {
              console.error("Required 'data-chart-id' or 'data-wow-spec' attribute wasn't found in " + html_id + ".")
              requirements = false;
            }
            state.wow_spec = html_element.getAttribute("data-wow-spec");
          } else {
            state.item_name = html_element.getAttribute("data-item-name");
            state.item_level = html_element.getAttribute("data-item-level");
          }
        } else {
          state.chart_id = html_element.getAttribute("data-chart-id");
        }

        let styled_chart = update_chart_style(state);

        // create new chart without data
        let new_chart = false;
        if (state.chart_engine == "highcharts") {
          try {
            new_chart = Highcharts.chart(html_id, styled_chart);
          } catch (error) {
            console.log("When trying to create a highcharts chart the following error occured. Did you include the necessary Highcharts scripts?");
            console.log(error);
            return;
          }
        } else if (state.chart_engine == "highcharts_old") {
          try {
            let tmp_styled_chart = styled_chart;
            tmp_styled_chart["chart"]["renderTo"] = html_id;
            new_chart = new Highcharts.Chart(tmp_styled_chart);
          } catch (error) {
            console.log("When trying to create a highcharts_old chart the following error occured. Did you include the necessary Highcharts scripts?");
            console.log(error);
            return;
          }
        }

        if (requirements) {
          load_data(state);
        } else {
          requirements_error(new_chart);
        }

        setTimeout(update_chart, 1, state, html_element, new_chart, 0);
      }
    }
  }

  /**
   *
   */
  async function load_data(state) {
    if (debug) {
      console.log("load_data");
    }

    let chart_id = state.chart_id;
    let data_type = state.data_type;
    let fight_style = state.fight_style;
    let item_name = state.item_name;
    let item_level = state.item_level;
    let wow_class = state.wow_class;
    let wow_spec = state.wow_spec;

    // early exit if the data is already present
    try {
      if (get_data_from_state(state)) {
        return;
      }
    } catch (error) {
      if (debug) {
        console.log("Data needs to be loaded.");
        console.log(error);
      }
    }
    const data_group = (data_type === 'trinket_compare') ? 'trinkets' : data_type;
    const data_name = [item_name, item_level, fight_style, wow_class, wow_spec]
      .filter(Boolean)
      .join('/');

    // local dev differentiation since no local db
    // can likely be removed in prod
    const base_url = (wow_class && wow_spec) ? host : localhost;

    const url = `${base_url}${path_to_data}${chart_id || data_group}${data_name ? `/${data_name}` : ''}`.replace(/\/+$/, '');

    if (data_type === 'trinket_compare') {
      const response = await getTrinketDataAsync(item_name, item_level, fight_style);
      state.html_element.dataset.loadedData = JSON.stringify(response);
    } else {

      let request = new XMLHttpRequest();
      if (debug) {
        console.log("Fetching data from: " + url);
      }
      request.open("GET", url, true); // async request

      request.onload = function (e) {
        if (request.readyState === 4) {
          if (request.status === 200) {
            let json = JSON.parse(request.responseText);
            state.html_element.dataset.loadedData = request.responseText;

            if (debug) {
              console.log(json);
              console.log("Load and save finished.");
            }
          } else {
            console.error(request.statusText);
          }
        }
      };
      request.onerror = function (e) {
        console.error('Fetching data from bloodmallet.com encountered an error, ', e);
      };
      request.send(null);
    }
  }

  function get_data_from_state(state) {
    return JSON.parse(state.html_element.dataset.loadedData);
  }

  /**
   * Update a chart with data from bloodmallet.com
   */
  function update_chart(state, html_element, chart, count) {
    if (debug) {
      console.log("update_chart");
    }

    let data_type = state.data_type;
    let limit = state.limit;
    let chart_engine = state.chart_engine;

    let spec_data = false;

    // early exits if data is missing
    try {
      spec_data = get_data_from_state(state);
    } catch (error) {
      if (count < 100) {
        setTimeout(update_chart, 200, state, html_element, chart, count + 1);
      }
      return;
    }
    state.data = spec_data;

    if (chart_engine != "highcharts_old") {
      chart.update({
        accessibility: {
          enable: false
        }
      }, false);
    }

    if (spec_data["error"] === true || spec_data["status"] === "error") {
      return simulation_error(html_element, spec_data);
    } else {
      wow_class = spec_data?.simc_settings?.class;
      wow_spec = spec_data?.simc_settings?.spec;
      fight_style = spec_data?.simc_settings?.fight_style;
    }
    state.data_type = data_type = spec_data["data_type"];

    // determine special charts that are only shown with a predetermined value_style
    if (state.data_type === "legendaries") {
      state.value_style = "absolute";
    } else if (state.data_type === "tier_set") {
      state.value_style = "absolute";
    }

    provide_meta_data(state, spec_data);

    // do secondary distribution charts in a different function
    if (data_type === "secondary_distributions") {
      return update_secondary_distribution_chart(state, html_element, chart);
    } else if (data_type === "talent_target_scaling") {
      return update_talent_target_scaling_chart(state, html_element, chart);
    }

    data_type = spec_data['data_type'];

    const data = spec_data;

    let dps_ordered_keys;
    let baseline_dps;
    let other_baselines = {};
    if (Object.keys(data).indexOf("sorted_data_keys") > -1 && (["windfury_totem", "power_infusion"].indexOf(data_type) > -1) && state.value_style === "absolute") {
      dps_ordered_keys = data["sorted_data_keys_2"].slice(0, limit);
    } else if (Object.keys(data).indexOf("sorted_data_keys") > -1) {
      dps_ordered_keys = data["sorted_data_keys"].slice(0, limit);
    } else {
      dps_ordered_keys = Object.keys(data["data"]);
    }
    if (["races", "talents", "soulbinds", "tier_set", "windfury_totem", "power_infusion", "trinket_compare"].includes(data_type)) {
      baseline_dps = 0;
    } else if (["legendaries", "soulbind_nodes", "covenants", "domination_shards"].includes(data_type)) {
      baseline_dps = data["data"]["baseline"];
    } else {
      baseline_dps = Math.min(...Object.values(data["data"]["baseline"]));
    }
    if (debug) {
      console.log("minimal itemlevel", data["simulated_steps"][data["simulated_steps"].length - 1]);
      console.log("baseline dps dict", data["data"]["baseline"]);
      console.log("Baseline dps: " + baseline_dps);
    }
    // add other baseline profiles, e.g. covenant profiles for legendaries
    for (let key of Object.keys(data["data"])) {
      if (key[0] === "{" && key[key.length - 1] === "}") {
        other_baselines[key] = data["data"][key];
      }
    }

    if (debug) {
      console.log("dps_ordered_keys", dps_ordered_keys);
      console.log("Baseline dps: " + baseline_dps);
      console.log("other baseline dps:", other_baselines);
    }

    let simulated_steps = [];
    if (data_type === "soulbinds") {
      simulated_steps = undefined;
    } else if (data_type === "tier_set") {
      simulated_steps = [
        "4p",
        "2p",
        "no tier",
      ];
    } else {
      simulated_steps = data["simulated_steps"];
    }
    if (debug) {
      console.log("simulated_steps: " + simulated_steps);
    }

    // filters

    // trinkets
    if (data_type === "trinkets") {
      // Itemlevels
      if (state.html_element.dataset.filterItemlevels !== undefined) {
        const ilevels = state.html_element.dataset.filterItemlevels.split(";");
        simulated_steps = simulated_steps.filter(element => ilevels.indexOf(element.toString()) === -1);
      }
      // filter by availability of simulated_steps
      if (simulated_steps) {
        dps_ordered_keys = dps_ordered_keys.filter(element =>
          simulated_steps.some(step => data["data"][element][step] !== undefined)
        );
      }
      // Active - Passive
      if (state.html_element.dataset.filterActivePassive !== undefined) {
        const active_passives = state.html_element.dataset.filterActivePassive.split(";");
        let filter_active_passive = [];
        active_passives.map(element => {
          if (element === "active") {
            filter_active_passive.push(true);
          } else if (element === "passive") {
            filter_active_passive.push(false);
          }
        });
        dps_ordered_keys = dps_ordered_keys.filter(element =>
          filter_active_passive.indexOf(data["data_active"][element]) === -1
        );
      }
      // Sources
      if (state.html_element.dataset.filterSources !== undefined) {
        const sources = state.html_element.dataset.filterSources.split(";");
        dps_ordered_keys = dps_ordered_keys.filter(element => sources.indexOf(data["data_sources"][element]) === -1);
      }

      if ("trinket_compare" !== data_type) {
        // resort dps_ordered_keys
        let tmp_list = [];
        for (let trinket of dps_ordered_keys) {
          let dps = undefined;
          for (let step of simulated_steps) {
            if (dps === undefined && data["data"][trinket][step] !== undefined) {
              dps = data["data"][trinket][step];
            } else if (data["data"][trinket][step] !== undefined && data["data"][trinket][step] > dps) {
              dps = data["data"][trinket][step];
            }
          }
          tmp_list.push([trinket, dps]);
        }
        tmp_list.sort((trinket1, trinket2) => trinket2[1] - trinket1[1]);
        dps_ordered_keys = tmp_list.map(element => element[0]);
      }
    }

    let subtitle = data["subtitle"];
    if (data_type === "power_infusion") {
      subtitle += "<br/>* Spec APL doesn't support external PI. Fallback for set PI timings was used to generate data.";
    }

    // set title and subtitle
    chart.setTitle(
      {
        text: data["title"]
      },
      {
        text: subtitle
      },
      false
    );

    // clear initial data
    while (chart.series[0]) {
      chart.series[0].remove(false);
    }

    let category_list = undefined;
    if (["talents"].indexOf(data_type) > -1) {
      category_list = dps_ordered_keys
        .map(element => {
          let links = [];
          for (let i = 0; i < element.length; i++) {
            links.push(get_category_name(state, (i + 1).toString() + element[i], data));
          }
          return links.join("");
        });
    } else if (["tier_set", "talent_target-scaling"].indexOf(data_type) > -1) {
      category_list = dps_ordered_keys
        .map(element => {
          return get_category_name(state, element, data);
        });
    } else {
      category_list = dps_ordered_keys
        .map(element => {
          // correct names which use a specific different baseline
          let shortened_name = element.indexOf("} ") > -1 ? element.slice(element.indexOf("} ") + 2, element.length) : element;
          shortened_name = shortened_name.indexOf(" +") > -1 ? shortened_name.slice(0, shortened_name.indexOf(" +")) : shortened_name;
          return get_category_name(state, shortened_name, data);
        });
    }

    if (data_type === "power_infusion") {
      // mark specs without PI support
      category_list = category_list.map(element => {
        if (Object.keys(spec_data).indexOf("profile_without_pi_support") > -1 && spec_data["profile_without_pi_support"].indexOf(element) > -1) {
          return element + "*";
        } else {
          return element;
        }
      });
    }

    if (debug) {
      console.log(category_list);
    }

    // rewrite the trinket names
    if (chart_engine == "highcharts") {
      chart.update({
        xAxis: {
          categories: category_list
        }
      }, false);
    } else if (chart_engine == "highcharts_old") {
      chart.xAxis[0].setCategories(category_list, false);
    }


    if (simulated_steps) {
      let tmp_dps_values = {};
      for (const name in data["data"]) {
        if (data["data"].hasOwnProperty(name)) {
          const information = data["data"][name];
          tmp_dps_values[name] = {};

          let previous_value = baseline_dps;
          if (data_type === "conduits") {
            previous_value = data["data"]["baseline"][data["covenant_mapping"][name]];
          }

          for (let i = simulated_steps.length - 1; i >= 0; i--) {
            const step = simulated_steps[i];
            let tmp_info = information.hasOwnProperty(state.covenant) ? information[state.covenant] : information;
            if (Number.isInteger(tmp_info)) {
              tmp_dps_values[name][step] = Math.max(tmp_info - previous_value, 0);
              previous_value = tmp_dps_values[name][step] === 0 ? previous_value : tmp_info;
            } else if (tmp_info.hasOwnProperty(step)) {
              tmp_dps_values[name][step] = Math.max(tmp_info[step] - previous_value, 0);
              previous_value = tmp_dps_values[name][step] === 0 ? previous_value : tmp_info[step];
            } else {
              tmp_dps_values[name][step] = 0;
            }
          }
        }
      }

      if (debug) {
        console.log("simulated_steps", simulated_steps);
        console.log(tmp_dps_values);
      }

      for (const simulation_step of simulated_steps) {

        let dps_array = [];

        for (let i = 0; i < dps_ordered_keys.length; i++) {
          const dps_key = dps_ordered_keys[i];
          let styled_value = get_styled_value(state, tmp_dps_values[dps_key][simulation_step], baseline_dps);
          dps_array.push(styled_value);
        }

        let simulation_step_clean = simulation_step;

        chart.addSeries({
          data: dps_array,
          name: simulation_step_clean,
        }, false);

      }
    } else if (["soulbind_nodes", "covenants"].includes(data_type)) {
      var dps_array = [];

      for (let i = 0; i < dps_ordered_keys.length; i++) {
        let dps_key = dps_ordered_keys[i];

        let dps_key_values = data["data"][dps_key] - baseline_dps;

        dps_array.push(get_styled_value(state, dps_key_values, baseline_dps));
      }

      chart.addSeries({
        data: dps_array,
        name: "Data",
        showInLegend: false
      }, false);

    } else if (["legendaries"].includes(data_type)) {
      let dps_array = [];
      let baseline_name = "{" + data["profile"]["character"]["covenant"] + "}";
      let special_cases = {}
      for (let special_case of Object.keys(other_baselines)) {
        special_cases[special_case] = [];
      }
      special_cases[baseline_name] = [];

      for (let dps_key of dps_ordered_keys) {
        let tmp_baseline_dps = baseline_dps;

        // special baseline profile
        if (dps_key.indexOf("} ") > -1) {
          let special_case_name = dps_key.slice(0, dps_key.indexOf("} ") + 1);
          tmp_baseline_dps = other_baselines[special_case_name];
          special_cases[special_case_name].push(get_styled_value(state, tmp_baseline_dps, baseline_dps));
          for (let special_case of Object.keys(special_cases)) {
            if (special_case !== special_case_name) {
              special_cases[special_case].push(0);
            }
          }
        } else {
          for (let special_case of Object.keys(special_cases)) {
            if (special_case !== baseline_name) {
              special_cases[special_case].push(0);
            }
            else {
              special_cases[special_case].push(get_styled_value(state, tmp_baseline_dps, tmp_baseline_dps));
            }
          }
        }

        let dps_key_values = data["data"][dps_key] - tmp_baseline_dps;
        dps_array.push(get_styled_value(state, dps_key_values, tmp_baseline_dps));
      }

      chart.addSeries({
        data: dps_array,
        name: "Legendary effect",
        showInLegend: true,
        color: "#ff7d0a"
      }, false);
      let mapper = {
        "night_fae": "Night Fae",
        "necrolord": "Necrolord",
        "venthyr": "Venthyr",
        "kyrian": "Kyrian"
      }
      for (let special_case of Object.keys(special_cases)) {
        chart.addSeries({
          data: special_cases[special_case],
          name: mapper[special_case.slice(1, special_case.length - 1)],
          showInLegend: true,
          color: covenants[mapper[special_case.slice(1, special_case.length - 1)]]["color"]
        }, false);
      }
    } else if (["windfury_totem", "power_infusion", "trinket_compare"].includes(data_type)) {
      let dps_array = [];
      let sortedKeys = [];

      let spec_color_map = {
        "Blood Death Knight": "#c41f3b",
        "Frost Death Knight": "#c41f3b",
        "Unholy Death Knight": "#c41f3b",
        "Havoc Demon Hunter": "#a330c9",
        "Vengeance Demon Hunter": "#a330c9",
        "Balance Druid": "#ff7d0a",
        "Feral Druid": "#ff7d0a",
        "Guardian Druid": "#ff7d0a",
        "Devastation Evoker": "#33937F",
        "Beast Mastery Hunter": "#abd473",
        "Marksmanship Hunter": "#abd473",
        "Survival Hunter": "#abd473",
        "Arcane Mage": "#69ccf0",
        "Fire Mage": "#69ccf0",
        "Frost Mage": "#69ccf0",
        "Brewmaster Monk": "#00ff96",
        "Windwalker Monk": "#00ff96",
        "Protection Paladin": "#f58cba",
        "Retribution Paladin": "#f58cba",
        "Shadow Priest": "#ffffff",
        "Assassination Rogue": "#fff569",
        "Outlaw Rogue": "#fff569",
        "Subtlety Rogue": "#fff569",
        "Elemental Shaman": "#0070de",
        "Enhancement Shaman": "#0070de",
        "Affliction Warlock": "#9482c9",
        "Demonology Warlock": "#9482c9",
        "Destruction Warlock": "#9482c9",
        "Arms Warrior": "#c79c6e",
        "Fury Warrior": "#c79c6e",
        "Protection Warrior": "#c79c6e",
      }

      if (["trinket_compare"].includes(data_type)) {
        let comparative_dps = {};
        for (let dps_key of dps_ordered_keys) {
          if (dps_key === "baseline") {
            continue;
          }
          let tmp_baseline_dps = Object.values(data["data"]["baseline"][dps_key])[0];
          let dps_key_values = data["data"][dps_key] - tmp_baseline_dps;
          comparative_dps[dps_key] = {
            "y": get_styled_value(state, dps_key_values, tmp_baseline_dps),
            "color": spec_color_map[dps_key]
          };
        }

        // Extract keys and sort them
        sortedKeys = Object.keys(comparative_dps)
          .sort((a, b) => comparative_dps[b].y - comparative_dps[a].y);

        // Remove 'baseline' key if it exists
        sortedKeys = sortedKeys.filter(key => key !== 'baseline');

        for (let key of sortedKeys) {
          dps_array.push(comparative_dps[key]);
        }
      } else {
        for (let dps_key of dps_ordered_keys) {
          let tmp_baseline_dps = data["data"]["{" + dps_key + "}"];
          let dps_key_values = data["data"][dps_key] - tmp_baseline_dps;
          dps_array.push({ "y": get_styled_value(state, dps_key_values, tmp_baseline_dps), "color": spec_color_map[dps_key] });
        }
      }

      chart.addSeries({
        data: dps_array,
        name: snake_case_to_title(data_type),
        showInLegend: false,
      }, false);

      if (["trinket_compare"].includes(data_type)) {
        // Update the x-axis categories
        if (chart_engine == "highcharts") {
          chart.update({
            xAxis: {
              categories: sortedKeys
            }
          }, false);
        } else if (chart_engine == "highcharts_old") {
          chart.xAxis[0].setCategories(sortedKeys, false);
        }
      }
    } else if (["domination_shards"].includes(data_type)) {
      for (let shard_type of Object.keys(domination_shard_colours)) {

        let dps_array = [];

        for (let dps_key of dps_ordered_keys) {
          let shard_name = dps_key;
          let alternative_dps_baseline = baseline_dps;
          if (dps_key.indexOf(" +") > -1) {
            shard_name = dps_key.split(" +")[0];
            alternative_dps_baseline = data["data"][shard_name];
          }

          if (data["shard_type"][shard_name] === shard_type) {

            let dps_key_values = data["data"][dps_key] - alternative_dps_baseline;

            dps_array.push(get_styled_value(state, dps_key_values, alternative_dps_baseline));
          } else {
            dps_array.push(get_styled_value(state, 0, alternative_dps_baseline));
          }
        }

        chart.addSeries({
          data: dps_array,
          name: shard_type + (dps_ordered_keys[0].indexOf(" +") > -1 ? " set" : ""),
          showInLegend: true,
          color: domination_shard_colours[shard_type]
        }, false);
      }

      if (dps_ordered_keys[0].indexOf(" +") > -1) {
        let set_array = [];
        for (let name of dps_ordered_keys) {
          let shard_name = name.split(" +")[0];
          let dps_key_values = data["data"][shard_name] - baseline_dps;

          set_array.push(get_styled_value(state, dps_key_values, baseline_dps));
        }

        chart.addSeries({
          data: set_array,
          name: "shard",
          showInLegend: true,
          color: "#ff7d0a"
        }, false);
      }

    } else if (["soulbinds"].includes(data_type)) {
      for (const covenant of Object.keys(covenants).sort().reverse()) {
        const covenant_id = covenants[covenant]["id"];

        let dps_array = [];
        for (const dps_key of dps_ordered_keys) {
          let dps_key_values = 0;
          if (data["covenant_mapping"][dps_key][0] === covenant_id) {
            dps_key_values = Math.max(...Object.values(data["data"][dps_key]));
          }

          dps_array.push(dps_key_values);
        }

        chart.addSeries({
          data: dps_array,
          name: get_translated_name(covenant, data, state),
          showInLegend: true,
          color: covenants[covenant]["color"]
        }, false);
      }
      chart.yAxis[0].options.title.text = absolute_damage_per_second;
      chart.yAxis[1].options.title.text = absolute_damage_per_second;

    } else { // race simulations
      var dps_array = [];

      for (let i = 0; i < dps_ordered_keys.length; i++) {
        let dps_key = dps_ordered_keys[i];

        let dps_key_values = data["data"][dps_key];

        dps_array.push(dps_key_values);
      }

      chart.addSeries({
        data: dps_array,
        name: "DPS",
        showInLegend: false
      }, false);

    }

    // add new legend title
    if (["trinkets"].indexOf(data_type) > -1) {
      chart.legend.title.attr({ text: "Itemlevel" });
    } else if (data_type === "races" || data_type === "domination_shards") {
      chart.legend.title.attr({ text: "" });
    }

    if (chart_engine == "highcharts_old") {
      chart.reflow();
    }

    html_element.style.height = 200 + dps_ordered_keys.length * 30 + "px";
    if (chart_engine == "highcharts") {
      chart.setSize(undefined, html_element.style.height);
    }

    // add wowdb tooltips, they don't check dynamically
    if (state.tooltip_engine == "wowdb") {
      setTimeout(() => {
        readd_wowdb_tooltips(html_element.id);
        chart.redraw();
      }, 1);
    } else if (state.tooltip_engine == "wowhead") {
      setTimeout(() => {
        window.$WowheadPower.refreshLinks();
        setTimeout(() => {
          chart.redraw();
        }, 300);
      }, 1);
    } else {
      setTimeout(() => {
        chart.redraw();
      }, 1);
    }
  }

  function get_covenant_from_soulbind(soulbind, data) {
    return covenant = Object.entries(data["covenant_ids"]).filter(key_value => {
      return key_value[1] === data["covenant_mapping"][soulbind][0];
    })[0][0];
  }

  function simulation_error(html_element, error_response) {
    let element = html_element;
    element.innerHTML = "";

    if (error_response["status"] === "error") {
      let information = document.createElement('p');
      information.innerText = error_response["message"];
      element.appendChild(information);
    } else {
      let information = document.createElement('p');
      information.innerText = "An error occured during simulation.";
      element.appendChild(information);

      let list = document.createElement('ul');

      let title = document.createElement('li');
      title.textContent = "Title: " + (error_response["title"] ? error_response["title"] : '~');
      list.appendChild(title);

      let spec = document.createElement('li');
      spec.textContent = "Spec: " + error_response["wow_spec"] + " " + error_response["wow_class"];
      list.appendChild(spec);

      let type = document.createElement('li');
      type.textContent = "Type: " + error_response["simulation_type"];
      list.appendChild(type);

      let fight_style = document.createElement('li');
      fight_style.textContent = "Fight style: " + error_response["fight_style"];
      list.appendChild(fight_style);

      let simulation_id = document.createElement('li');
      simulation_id.textContent = "ID: " + error_response["id"];
      list.appendChild(simulation_id);

      let custom_profile = document.createElement('li');
      custom_profile.textContent = "Custom profile:";
      list.appendChild(custom_profile);
      custom_profile.appendChild(document.createElement('br'));
      let profile = document.createElement('textarea');
      // profile.readOnly = true;
      profile.value = error_response["custom_profile"];
      profile.placeholder = "No custom profile";
      profile.style.width = "100%";
      profile.classList.add("form-control");
      custom_profile.appendChild(profile);

      let log_item = document.createElement('li');
      log_item.textContent = "Log:";
      list.appendChild(log_item);
      log_item.appendChild(document.createElement('br'));
      let log = document.createElement('textarea');
      // log.readOnly = true;
      log.value = error_response["log"];
      log.placeholder = "No log available";
      log.style.width = "100%";
      log.classList.add("form-control");
      log_item.appendChild(log);

      element.appendChild(list);
    }

  }

  /**
   * 
   * @param {object} state 
   * @param {float} dps 
   * @param {float} baseline_dps 
   * @returns based on value_style either absolute or relative gain
   */
  function get_styled_value(state, dps, baseline_dps) {
    if (state.value_style === "absolute") {
      return dps;
    } else if (state.value_style === "relative") {
      return Math.round(dps * 10000 / baseline_dps) / 100;
    } else {
      console.error("Unknown value-style", state.value_style);
    }
  }

  /**
   * Function updates a chart to show a 
   * @param {object} state 
   * @param {object} html_element 
   * @param {object} chart 
   * @returns nothing
   */
  function update_talent_target_scaling_chart(state, html_element, chart) {
    if (debug) {
      console.log("update_talent_target_scaling_chart");
    }

    let html_id = html_element.id;

    let chart_id = state.chart_id;
    let fight_style = state.fight_style;
    let wow_class = state.wow_class;
    let wow_spec = state.wow_spec;
    let chart_engine = state.chart_engine;

    let spec_data = get_data_from_state(state);

    let post_chart = document.getElementById("post_chart");
    post_chart.hidden = false;

    wow_class = spec_data['profile']['character']['class'];
    wow_spec = spec_data['profile']['character']['spec'];
    fight_style = spec_data['simc_settings']['fight_style'];


    let styled_chart = update_chart_style(state);

    // create new chart without data
    let new_chart = false;
    if (state.chart_engine == "highcharts") {
      try {
        new_chart = Highcharts.chart(html_id, styled_chart);
      } catch (error) {
        console.log("When trying to create a highcharts chart the following error occurred. Did you include the necessary Highcharts scripts?");
        console.log(error);
        return;
      }
    } else if (state.chart_engine == "highcharts_old") {
      try {
        let tmp_styled_chart = styled_chart;
        tmp_styled_chart["chart"]["renderTo"] = html_id;
        new_chart = new Highcharts.Chart(tmp_styled_chart);
      } catch (error) {
        console.log("When trying to create a highcharts_old chart the following error occurred. Did you include the necessary Highcharts scripts?");
        console.log(error);
        return;
      }
    }

    chart = undefined;
    chart = new_chart;

    // delete all old series data
    while (chart.series[0]) {
      chart.series[0].remove(false);
    }

    for (const talent_combination_name of spec_data["sorted_data_keys"]) {
      const talent_data = spec_data["data"][talent_combination_name];
      const target_counts = Object.keys(talent_data);

      let min_target_count = -1;
      if (state.talent_target_scaling_min_target_count > -1) {
        min_target_count = state.talent_target_scaling_min_target_count;
      } else {
        min_target_count = Math.min(...target_counts.map(element => parseInt(element)));
      }
      // const min_target_count = 10;
      let max_target_count = -1;
      if (state.talent_target_scaling_max_target_count > -1) {
        max_target_count = state.talent_target_scaling_max_target_count;
      } else {
        max_target_count = Math.max(...target_counts.map(element => parseInt(element)));
      }
      // const max_target_count = 1;

      let series_data = [];
      for (let target_count = min_target_count; target_count <= max_target_count; target_count++) {
        if (target_counts.indexOf(target_count.toString()) >= -1) {
          series_data.push([target_count, talent_data[target_count]]);
        } else {
          series_data.push([target_count, null]);
        }
      }

      let series = {
        name: talent_combination_name,
        data: series_data
      };

      chart.addSeries(series, false);
      chart.update({ xAxis: { min: min_target_count - 0.5, max: max_target_count + 0.5 } });
    }

    try {
      chart.setTitle(
        {
          text: spec_data["title"]
        },
        {
          text: spec_data["subtitle"]
        },
        false
      );
    } catch (error) {
      console.log(error)
    }

    // chart.update()

    chart.redraw();
  }

  function update_secondary_distribution_chart(state, html_element, chart) {
    if (debug) {
      console.log("update_secondary_distribution_chart");
    }

    let html_id = html_element.id;

    let chart_id = state.chart_id;
    let fight_style = state.fight_style;
    let wow_class = state.wow_class;
    let wow_spec = state.wow_spec;
    let chart_engine = state.chart_engine;

    let spec_data = false;
    spec_data = get_data_from_state(state);

    wow_class = spec_data['simc_settings']['class'];
    wow_spec = spec_data['simc_settings']['spec'];
    fight_style = spec_data['simc_settings']['fight_style'];

    let styled_chart = update_chart_style(state);

    // create new chart without data
    let new_chart = false;
    if (state.chart_engine == "highcharts") {
      try {
        new_chart = Highcharts.chart(html_id, styled_chart);
      } catch (error) {
        console.log("When trying to create a highcharts chart the following error occurred. Did you include the necessary Highcharts scripts?");
        console.log(error);
        return;
      }
    } else if (state.chart_engine == "highcharts_old") {
      try {
        let tmp_styled_chart = styled_chart;
        tmp_styled_chart["chart"]["renderTo"] = html_id;
        new_chart = new Highcharts.Chart(tmp_styled_chart);
      } catch (error) {
        console.log("When trying to create a highcharts_old chart the following error occurred. Did you include the necessary Highcharts scripts?");
        console.log(error);
        return;
      }
    }

    chart = undefined;
    chart = new_chart;

    // build talent selection area if not already done earlier
    if (is_bloodmallet_dot_com() && document.getElementById(spec_data["data_type"] + "-selector-area").children.length === 0) {
      let select_root = document.getElementById(spec_data["data_type"] + "-selector-area");
      let select = document.createElement("select");
      select.id = spec_data["data_type"] + "-selector";
      select.classList.add("custom-select");

      for (const profile_name of Object.keys(spec_data["sorted_data_keys"])) {
        let option = document.createElement("option");
        option.value = profile_name;
        option.text = "Build: " + profile_name;

        if (profile_name === "baseline") {
          option.selected = true;
        }

        select.appendChild(option);
      }

      select_root.appendChild(select);

      select_root.addEventListener("change", () => { bloodmallet_chart_import(); });
      if (Object.keys(spec_data["sorted_data_keys"]).length > 1) {
        select_root.hidden = false;
      }
    }

    let talent_combination = "baseline";
    if (is_bloodmallet_dot_com() && document.getElementById(spec_data["data_type"] + "-selector") !== undefined) {
      talent_combination = document.getElementById(spec_data["data_type"] + "-selector").value;
    }

    // get max dps of the whole data set
    let max_dps = spec_data["data"][talent_combination][spec_data["sorted_data_keys"][talent_combination][0]];
    // get min dps of the whole data set
    let min_dps = spec_data["data"][talent_combination][spec_data["sorted_data_keys"][talent_combination][spec_data["sorted_data_keys"][talent_combination].length - 1]];

    // prepare series with standard data
    let max_color = create_color(100, 0, 100);
    let min_color = create_color(0, 0, 100);
    let series = {
      name: Intl.NumberFormat().format(max_dps) + " DPS",
      color: "rgb(" + max_color[0] + "," + max_color[1] + "," + max_color[2] + ")",
      data: []
    };

    // add a marker for each distribution in the data set
    for (let distribution of Object.keys(spec_data["data"][talent_combination])) {
      // console.log(distribution);

      let talent_data_distribution = spec_data["data"][talent_combination][distribution];

      // get the markers color
      let color_set = create_color(
        talent_data_distribution,
        min_dps,
        max_dps
      );

      // width of the border of the marker, 0 for all markers but the max, which gets 3
      let line_width = 1;
      let line_color = "#232227";
      // adjust marker radius depending on distance to max
      // worst dps: 2
      // max dps: 5 (increased to 8 to fit the additional border)
      let radius = 5; //2 + 3 * (talent_data_distribution - min_dps) / (max_dps - min_dps);
      if (max_dps === talent_data_distribution) {
        line_width = 3;
        radius = 8;
        line_color = state.font_color;
      }

      // undefined data label for all markers unless they are the "max" values
      let data_label = undefined;

      // 70 is the max possible value in data. would need adjustement if data changes to other max values. But I doubt this'll happen.
      if (distribution.indexOf("70") > -1) {
        data_label = {
          enabled: true,
          allowOverlap: true,
        };

        switch (distribution.indexOf("70")) {
          case 0: // "70_10_10_10"
            data_label.format = "Crit";
            data_label.verticalAlign = "top";
            break;
          case 3: // "10_70_10_10"
            data_label.format = "Haste";
            break;
          case 6: // "10_10_70_10"
            data_label.format = "Mastery";
            data_label.verticalAlign = "top";
            break;
          case 9: // "10_10_10_70"
            data_label.format = "Versatility";
            data_label.verticalAlign = "top";
            break;

          default:
            // how did we even end up here?
            break;
        }
      }
      const secondary_sum = spec_data["secondary_sum"];

      let crit = parseInt(distribution.split("_")[0]);
      let haste = parseInt(distribution.split("_")[1]);
      let mastery = parseInt(distribution.split("_")[2]);
      let versatility = parseInt(distribution.split("_")[3]);

      // push marker data into the series
      series.data.push({
        // formulas slowly snailed together from combining different relations within https://en.wikipedia.org/wiki/Equilateral_triangle and https://en.wikipedia.org/wiki/Pythagorean_theorem
        x: ((Math.sqrt(3) / 2) * (crit + (1 / 3) * haste)),
        y: (Math.sqrt(2 / 3) * haste),
        z: (mastery + 0.5 * crit + 0.5 * haste),

        name: distribution,
        // flat markers with dark border (borders are prepared further up)
        color: "rgb(" + color_set[0] + "," + color_set[1] + "," + color_set[2] + ")",

        // add additional information required for tooltips
        dps: talent_data_distribution,
        dps_max: max_dps,
        dps_min: min_dps,
        stat_crit: crit * secondary_sum / 100,
        stat_haste: haste * secondary_sum / 100,
        stat_mastery: mastery * secondary_sum / 100,
        stat_vers: versatility * secondary_sum / 100,
        stat_sum: secondary_sum,
        // add marker information
        marker: {
          radius: radius,
          lineColor: line_color,
          lineWidth: line_width
        },
        // add visible data labels (crit, haste, mastery, vers)
        dataLabels: data_label,
      });
    }

    // delete all old series data
    while (chart.series[0]) {
      chart.series[0].remove(false);
    }

    chart.addSeries(series, false);
    // make sure this color matches the value of color_min in create_color(...)
    chart.addSeries({ name: Intl.NumberFormat().format(min_dps) + " DPS", color: "rgb(" + min_color[0] + "," + min_color[1] + "," + min_color[2] + ")" }, false);

    try {
      chart.setTitle(
        {
          text: spec_data["title"]
        },
        {
          text: spec_data["subtitle"]
        },
        false
      );
    } catch (error) {
      console.log(error)
    }

    chart.redraw();

    // Add mouse and touch events for rotation
    (function (H) {
      function dragStart(eStart) {
        eStart = chart.pointer.normalize(eStart);

        var posX = eStart.chartX,
          posY = eStart.chartY,
          alpha = chart.options.chart.options3d.alpha,
          beta = chart.options.chart.options3d.beta,
          sensitivity = 5; // lower is more sensitive

        function drag(e) {
          // Get e.chartX and e.chartY
          e = chart.pointer.normalize(e);

          chart.update({
            chart: {
              options3d: {
                alpha: alpha + (e.chartY - posY) / sensitivity,
                beta: beta + (posX - e.chartX) / sensitivity
              }
            }
          }, undefined, undefined, false);
        }

        chart.unbindDragMouse = H.addEvent(document, 'mousemove', drag);
        chart.unbindDragTouch = H.addEvent(document, 'touchmove', drag);

        H.addEvent(document, 'mouseup', chart.unbindDragMouse);
        H.addEvent(document, 'touchend', chart.unbindDragTouch);
      }

      H.addEvent(chart.container, 'mousedown', dragStart);
      H.addEvent(chart.container, 'touchstart', dragStart);
    }(Highcharts));
  }

  /**
   *  Creates the rgb color array for the dps of a marker.
   *
   * @param {Int} dps
   * @param {Int} min_dps
   * @param {Int} max_dps
   */
  function create_color(dps, min_dps, max_dps) {
    if (debug)
      console.log("create_color");

    // color of lowest DPS
    let color_min = [0, 255, 255];
    // additional color step between min and max
    let color_mid = [255, 255, 0];
    // color of  max dps
    let color_max = [255, 0, 0];

    // calculate the position of the mid color in this relation to ensure a smooth color transition (color distance...if something like this exists) between the three
    let diff_mid_max = 0;
    let diff_min_mid = 0;
    for (let i = 0; i < 3; i++) {
      diff_mid_max += Math.abs(color_max[i] - color_mid[i]);
      diff_min_mid += Math.abs(color_mid[i] - color_min[i]);
    }
    // ratio from min to max to describe the position of the id color
    let mid_ratio = diff_min_mid / (diff_min_mid + diff_mid_max);
    // mid dps resulting from the ratio
    let mid_dps = min_dps + (max_dps - min_dps) * mid_ratio;

    // calculate color based on relative dps
    if (dps >= mid_dps) {
      let percent_of_max = (dps - mid_dps) / (max_dps - mid_dps);
      return [
        Math.floor(color_max[0] * percent_of_max + color_mid[0] * (1 - percent_of_max)),
        Math.floor(color_max[1] * percent_of_max + color_mid[1] * (1 - percent_of_max)),
        Math.floor(color_max[2] * percent_of_max + color_mid[2] * (1 - percent_of_max))
      ];
    } else {
      let percent_of_mid = (dps - min_dps) / (mid_dps - min_dps);
      return [
        Math.floor(color_mid[0] * percent_of_mid + color_min[0] * (1 - percent_of_mid)),
        Math.floor(color_mid[1] * percent_of_mid + color_min[1] * (1 - percent_of_mid)),
        Math.floor(color_mid[2] * percent_of_mid + color_min[2] * (1 - percent_of_mid))
      ];
    }
  }

  /**
   * Function to help catch defered loaded jQuery.
   */
  function readd_wowdb_tooltips(chart_id) {
    if (debug) {
      console.log("readd_wowdb_tooltips");
    }
    try {
      CurseTips['wowdb-tooltip'].watchElements(document.getElementById(chart_id).getElementsByTagName('a'));
    } catch (error) {
      console.log("Setting wowdb (CurseTips) tooltips failed. Error: ", error);
    }
  }

  /**
   * Create tooltip-ready link
   * @param {string} key name of the div/chart
   * @param {json} data loaded data from bloodmallet.com for this chart
   */
  function get_category_name(state, key, data) {
    if (debug) {
      console.log("get_category_name");
      console.log(key);
    }

    // start constructing links
    // wowhead, wowdb, or plain text if no matching origin is provided

    // fallback
    if (state.tooltip_engine != "wowhead" && state.tooltip_engine != "wowdb") {
      return get_translated_name(key, data, state);
    }

    // races don't have links/tooltips
    if (["races", "windfury_totem", "power_infusion"].includes(state.data_type)) {
      return get_translated_name(key, data, state);
    }

    if (["tier_set", "talent_target_scaling"].includes(state.data_type)) {
      const profile_index = data["sorted_data_keys"].indexOf(key);
      let id = "override-profile-" + profile_index;
      let link = '<a href="#' + id + '">';
      link += get_translated_name(key, data, state);
      link += '</a>';
      return link;
    }

    if (["soulbinds"].includes(state.data_type)) {
      let link = '<a href="#' + key + '">';
      link += get_translated_name(key, data, state);
      link += '</a>';
      return link;
    }

    // wowhead
    if (state.tooltip_engine == "wowhead") {
      let a = document.createElement("a");
      a.href = "https://" + (state.language === "en" ? "www" : state.language) + ".wowhead.com/";
      if (data.hasOwnProperty("item_ids") && data["item_ids"].hasOwnProperty(key)) {
        a.href += "item=" + data["item_ids"][key] + "/" + slugify(key);

        if (data["simulated_steps"] !== undefined) {
          let ilvl = data["simulated_steps"][data["simulated_steps"].length - 1];
          // fix special case of effects named "XYZ 1_340"
          if (typeof ilvl === 'string') {
            if (ilvl.indexOf("_") > -1) {
              ilvl = ilvl.split("_")[1];
            }
          }
          a.href += "&ilvl=" + ilvl;
        }
      } else if (data.hasOwnProperty("spell_ids") && data["spell_ids"].hasOwnProperty(key)) {
        a.href += "spell=" + data["spell_ids"][key] + '/' + slugify(key);
      } else if (state.data_type === "talents") {
        if (key[1] === "0") {
          return key[1];
        } else {
          a.href += "spell=" + data["talent_data"][key[0]][key[1]]["spell_id"];
        }
      }
      if (state.data_type === "talents") {
        a.appendChild(document.createTextNode(key[1]));
      } else {
        a.appendChild(document.createTextNode(get_translated_name(key, data, state)));
      }

      return a.outerHTML;
    }

    if (state.tooltip_engine == "wowdb") {
      let a = document.createElement('a');
      a.href = "http://www.wowdb.com/";
      try {
        a.href += "items/" + data["item_ids"][key]; // item id
      } catch (error) {
        if (debug) {
          console.log(error);
          console.log("We're probably looking at a spell.");
        }
      }

      // if it's an item try to add itemlevel
      if (a.href.indexOf("items") > -1) {
        let ilvl = data["simulated_steps"][data["simulated_steps"].length - 1];
        // fix special case of effects e.g. "XYZ 1_340"
        if (typeof ilvl === 'string') {
          if (ilvl.indexOf("_") > -1) {
            ilvl = ilvl.split("_")[1];
          }
        }
        a.href += "?itemLevel=" + ilvl;
      }

      try {
        a.href += "spells/" + data["spell_ids"][key]; // spell id
      } catch (error) {
        if (debug) {
          console.log(error);
          console.log("We're probably looking at an item.");
        }
      }

      if (state.data_type === "talents") {
        if (key[1] === "0") {
          return key[1];
        } else {
          a.href += "spells/" + data["talent_data"][key[0]][key[1]]["spell_id"];
        }
      }

      a.dataset.tooltipHref = a.href;

      let translation = undefined;
      if (state.data_type === "talents") {
        translation = key[1];
      } else {
        translation = get_translated_name(key, data, state);
      }

      a.appendChild(document.createTextNode(translation));

      return a.outerHTML;
    }

  }

  /**
   * Function to update title and subtitle on init error.
   * @param {int} id
   */
  function requirements_error(chart) {
    chart.setTitle({ text: "Wrong chart setup" }, { text: "Missing 'data-chart-id', 'data-wow-class' or 'data-wow-spec'. See <a href=\"https://github.com/Bloodmallet/bloodmallet_web_frontend/wiki/How-to-import-charts\">wiki</a>" });
  }

  /**
   * All hail https://gist.github.com/mathewbyrne/1280286
   * @param {*} text
   */
  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  /**
   * Returns styled chart
   */
  function update_chart_style(state) {
    if (debug) {
      console.log("update_chart_style");
    }
    if (state.chart_engine == "highcharts" || state.chart_engine == "highcharts_old") {

      let link = "https://bloodmallet.com/";
      if (state.chart_id !== undefined) {
        link += "chart/" + state.chart_id;
      } else if (state.wow_class !== undefined && state.wow_spec !== undefined && state.data_type !== undefined && state.fight_style) {
        link += "chart/" + state.wow_class + "/" + state.wow_spec + "/" + state.data_type + "/" + state.fight_style;
      }

      if (state.data_type === "secondary_distributions") {
        return {
          accessibility: { enabled: false },
          credits: { enabled: false },
          chart: {
            renderTo: 'scatter_plot_chart',
            type: "scatter3d",
            backgroundColor: null,
            className: "mx-auto",
            animation: false,
            height: 800,
            width: 800,
            options3d: {
              enabled: true,
              alpha: 10,
              beta: 30,
              depth: 800,
              fitToPlot: false,
            }
          },
          legend: {
            enabled: true,
            backgroundColor: state.background_color,
            borderColor: state.font_color,
            borderWidth: 1,
            align: "right",
            verticalAlign: "middle",
            layout: "vertical",
            itemStyle: { "color": state.font_color },
            itemHoverStyle: { "color": state.font_color }
          },
          plotOptions: {
            series: {
              animation: false,
              dataLabels: {
                allowOverlap: true,
                style: {
                  color: state.font_color,
                  fontSize: state.font_size,
                  fontWeight: "400",
                  textOutline: ""
                }
              },
              events: {
                legendItemClick: function () {
                  return false;
                }
              },
            },
          },
          series: [],
          title: {
            text: "Loading data...", //"Title placeholder",
            useHTML: true,
            style: {
              color: state.font_color,
              fontSize: font_size
            }
          },
          subtitle: {
            text: "...from <a href=\"https://bloodmallet.com\">bloodmallet</a>",
            useHTML: true,
            style: {
              color: state.font_color,
              fontSize: font_size
            }
          },
          tooltip: {
            headerFormat: '',
            pointFormatter: function () {
              return '<table class="">\
                <thead>\
                  <tr>\
                    <th scope="col"></th>\
                    <th scope="col">Absolute</th>\
                    <th scope="col">Relative</th>\
                  </tr>\
                </thead>\
                <tbody>\
                  <tr>\
                    <th scope="row">DPS</th>\
                    <td>' + Intl.NumberFormat().format(this.dps) + '</td>\
                    <td>' + Math.round(this.dps / this.dps_max * 10000) / 100 + '%</td>\
                  </tr>\
                  <tr>\
                    <th scope="row">Crit</th>\
                    <td>' + Intl.NumberFormat().format(this.stat_crit) + '</td>\
                    <td>' + this.name.split("_")[0] + '%</td>\
                  </tr>\
                  <tr>\
                    <th scope="row">Haste</th>\
                    <td>' + Intl.NumberFormat().format(this.stat_haste) + '</td>\
                    <td>' + this.name.split("_")[1] + '%</td>\
                  </tr>\
                  <tr>\
                    <th scope="row">Mastery</th>\
                    <td>' + Intl.NumberFormat().format(this.stat_mastery) + '</td>\
                    <td>' + this.name.split("_")[2] + '%</td>\
                  </tr>\
                  <tr>\
                    <th scope="row">Versatility</th>\
                    <td>' + Intl.NumberFormat().format(this.stat_vers) + '</td>\
                    <td>' + this.name.split("_")[3] + '%</td>\
                  </tr>\
                </tbody>\
              </table>';
            },
            useHTML: true,
            borderColor: state.background_color,
          },
          xAxis: {
            min: 0,
            max: 80,
            tickInterval: 20,
            startOnTick: true,
            endOnTick: true,
            title: "",
            labels: {
              enabled: false,
            },
            gridLineWidth: 1,
            gridLineColor: state.axis_color,
          },
          yAxis: {
            min: -10,
            max: 70,
            tickInterval: 20,
            startOnTick: true,
            endOnTick: true,
            title: "",
            labels: {
              enabled: false,
            },
            gridLineWidth: 1,
            gridLineColor: state.axis_color,
          },
          zAxis: {
            min: 10,
            max: 90,
            tickInterval: 20,
            startOnTick: true,
            endOnTick: true,
            title: "",
            labels: {
              enabled: false,
            },
            reversed: true,
            gridLineWidth: 1,
            gridLineColor: state.axis_color,
          },
        }
      } else if (state.data_type === "talent_target_scaling") {
        return {
          accessibility: { enabled: false },
          credits: {
            href: link,
            text: "bloodmallet",
            style: {
              fontSize: font_size
            }
          },
          chart: {
            // renderTo: 'scatter_plot_chart',
            // type: "scatter3d",
            backgroundColor: null,
            animation: false,
            height: 650,
            // width: 800,
            // options3d: {
            //   enabled: true,
            //   alpha: 10,
            //   beta: 30,
            //   depth: 800,
            //   fitToPlot: false,
            // }
          },
          colors: bar_colors,
          legend: {
            enabled: true,
            backgroundColor: state.background_color,
            borderColor: state.font_color,
            borderWidth: 1,
            align: "center",
            verticalAlign: "top",
            layout: "horizontal",
            itemStyle: { "color": state.font_color },
            itemHoverStyle: { "color": state.font_color }
          },
          plotOptions: {
            series: {
              animation: false,
              connectNulls: true,
              dataLabels: {
                allowOverlap: true,
                style: {
                  color: state.font_color,
                  fontSize: state.font_size,
                  fontWeight: "400",
                  textOutline: ""
                }
              },
              events: {
                legendItemClick: function () {
                  return false;
                }
              },
            },
          },
          series: [],
          title: {
            text: "Loading data...", //"Title placeholder",
            useHTML: true,
            style: {
              color: state.font_color,
              fontSize: font_size
            }
          },
          subtitle: {
            text: "...from <a href=\"https://bloodmallet.com\">bloodmallet</a>",
            useHTML: true,
            style: {
              color: state.font_color,
              fontSize: font_size
            }
          },
          xAxis: {
            tickInterval: 1,
            title: {
              text: "Target count",
              style: {
                color: default_font_color,
              }
            },
            labels: {
              enabled: true,
              style: {
                color: default_font_color,
              }
            },
            gridLineWidth: 1,
            gridLineColor: state.axis_color,
          },
          yAxis: {
            // min: 0,
            title: {
              text: "DPS",
              style: {
                color: default_font_color,
              }
            },
            labels: {
              enabled: true,
              style: {
                color: default_font_color,
              }
            },
            gridLineWidth: 1,
            gridLineColor: state.axis_color,
          }
        }
      }

      let background_color = state.background_color;
      let axis_color = state.axis_color;
      let font_color = state.font_color;


      let styled_chart = {
        accessibility: { enabled: false },
        chart: {
          type: "bar",
          backgroundColor: background_color,
          style: {
            fontFamily: "-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\""
          }
        },
        colors: bar_colors,
        credits: {
          href: link,
          text: "bloodmallet",
          style: {
            fontSize: font_size
          }
        },
        legend: {
          align: "right",
          backgroundColor: background_color,
          borderColor: axis_color,
          borderWidth: 1,
          floating: false,
          itemMarginBottom: 3,
          itemMarginTop: 0,
          layout: 'vertical',
          reversed: true,
          shadow: false,
          verticalAlign: "middle",
          x: 0,
          y: 0,
          itemStyle: {
            color: font_color,
          },
          itemHoverStyle: {
            color: font_color,
          },
          title: {
            text: " ",
            style: {
              color: default_font_color
            }
          },
          symbolRadius: 0
        },
        plotOptions: {
          series: {
            animation: false,
            stacking: "normal",
            borderColor: default_background_color,
            events: {
              legendItemClick: function () { return false; }
            },
            style: {
              textOutline: false,
              fontSize: font_size,
            },
            point: {
              events: {
                click: function (event) {
                  var chart = this.series.yAxis;
                  chart.removePlotLine('helperLine');
                  chart.addPlotLine({
                    value: this.stackY,
                    color: state.font_color,
                    width: 2,
                    id: 'helperLine',
                    zIndex: 5,
                    label: {
                      text: this.series.name + ' ' + this.category,
                      style: {
                        color: state.font_color,
                        fontSize: font_size,
                      },
                      align: 'left',
                      verticalAlign: 'bottom',
                      rotation: 0,
                      y: -5
                    },
                  });
                }
              }
            }
          }
        },
        series: [],
        title: {
          text: "Loading data...", //"Title placeholder",
          useHTML: true,
          style: {
            color: font_color,
            fontSize: font_size
          }
        },
        subtitle: {
          text: "...from <a href=\"https://bloodmallet.com\">bloodmallet</a>",
          useHTML: true,
          style: {
            color: font_color,
            fontSize: font_size
          }
        },
        tooltip: {
          headerFormat: "<b>{point.x}</b>",
          shared: true,
          backgroundColor: default_background_color,
          borderColor: default_axis_color,
          style: {
            color: default_font_color,
            fontSize: font_size,
          },
          useHTML: true,
          // adding this as a potential tooltip positioning fix. changes tooltip position to be inside the bar rather than at the end
          // positioner: function (boxWidth, boxHeight, point) {
          //   return {
          //     x: point.plotX,
          //     y: point.plotY
          //   };
          // }
        },
        xAxis: {
          categories: [],
          labels: {
            useHTML: true,
            style: {
              color: default_font_color,
              fontSize: font_size,
            }
          },
          gridLineWidth: 0,
          gridLineColor: default_axis_color,
          lineColor: default_axis_color,
          tickColor: default_axis_color
        },
        // two yAxis, to "double" the description
        yAxis: [{
          labels: {
            //enabled: true,
            style: {
              color: default_axis_color
            },
          },
          min: 0,
          stackLabels: {
            enabled: true,
            formatter: function () {
              return Intl.NumberFormat().format(this.total);
            },
            style: {
              color: default_font_color,
              textOutline: false,
              fontSize: font_size,
              fontWeight: "normal"
            }
          },
          title: {
            text: state.value_style === "absolute" ? absolute_damage_per_second : relative_damage_per_second,
            style: {
              color: default_axis_color
            }
          },
          gridLineWidth: 1,
          gridLineColor: default_axis_color
        }, {
          linkedTo: 0,
          opposite: true,
          labels: {
            //enabled: true,
            style: {
              color: default_axis_color
            },
          },
          min: 0,
          stackLabels: {
            enabled: true,
            formatter: function () {
              return Intl.NumberFormat().format(this.total);
            },
            style: {
              color: default_font_color,
              textOutline: false,
              fontSize: font_size,
              fontWeight: "normal"
            }
          },
          title: {
            text: state.value_style === "absolute" ? absolute_damage_per_second : relative_damage_per_second,
            style: {
              color: default_axis_color
            }
          },
          gridLineWidth: 1,
          gridLineColor: default_axis_color

        }]
      };

      // TODO: https://scotch.io/bar-talk/copying-objects-in-javascript
      // step 1: JSON.parse(JSON.stringify(obj))
      // step 2: get functions with Object.assign({}, obj)

      styled_chart.tooltip.formatter = function () {
        let container = document.createElement('div');
        container.style.margin = '-4px -7px -7px -7px';
        container.style.padding = '3px 3px 6px 3px';
        container.style.backgroundColor = (background_color !== "transparent") ? background_color : default_background_color;
        if (state.chart_engine === "highcharts_old") {
          container.style.margin = '-7px';
        }

        let name_div = document.createElement('div');
        container.appendChild(name_div);
        name_div.style.marginLeft = '9px';
        name_div.style.marginRight = '9px';
        name_div.style.marginBottom = '6px';
        name_div.style.fontWeight = '700';
        name_div.innerHTML = this.x;

        let cumulative_amount = 0;
        for (var i = this.points.length - 1; i >= 0; i--) {
          cumulative_amount += this.points[i].y;
          let multi_values = false;
          let tmp_val = 0;
          for (let point of this.points) {
            if (point.y !== 0 && tmp_val !== 0 && tmp_val !== point.y) {
              multi_values = true;
            } else if (point.y !== 0 && tmp_val === 0) {
              tmp_val = point.y;
            }
          }
          let does_value_exist_in_original_data = undefined;
          if (state.data_type !== "talents") {
            let name = new DOMParser().parseFromString(this.x, "text/html").body.firstChild.innerText;
            // find name if a special baseprofile was used e.g. "{Kyrian} Legendary name"
            if (!state.data["data"].hasOwnProperty(name)) {
              let actual_name = undefined;
              for (let tmp_name of Object.keys(state.data["data"])) {
                if (tmp_name.slice(tmp_name.indexOf("} ") + 2) === name) {
                  actual_name = tmp_name;
                }
              }
              if (actual_name !== undefined) {
                name = actual_name;
              }
            }
            if (name === undefined) {
              // dealing with a name that is not a link, e.g. Races
              name = this.x;
            }
            // assume name is a translated one. get the base english version
            let english_name = get_base_name_from_translation(name, state.data, state);
            if (state.data["data"].hasOwnProperty(english_name)) {
              does_value_exist_in_original_data = state.data["data"][english_name].hasOwnProperty(this.points[i].series.name);
            }
          }

          if (this.points[i].y !== 0 || does_value_exist_in_original_data) {
            let point_div = document.createElement('div');
            container.appendChild(point_div);

            let block_span = document.createElement('span');
            point_div.appendChild(block_span);
            block_span.style.marginLeft = '9px';
            block_span.style.borderLeft = '9px solid ' + this.points[i].series.color;
            block_span.style.paddingLeft = '4px';
            if (Number.isInteger(this.points[i].series.name)) {
              block_span.appendChild(document.createTextNode(this.points[i].series.name + ":"));
            }

            let unit = "";
            if (["soulbinds", "races", "talents"].includes(state.data_type)) {
              unit = "";
            } else if (state.value_style === "relative") {
              unit = "%";
            }
            point_div.appendChild(document.createTextNode('\u00A0\u00A0' + Intl.NumberFormat().format(cumulative_amount) + unit));
          }
        }

        return container.outerHTML;
      };
      styled_chart.tooltip.backgroundColor = (background_color !== "transparent") ? background_color : default_background_color;
      styled_chart.tooltip.borderColor = axis_color;
      styled_chart.tooltip.style.color = font_color;

      styled_chart.xAxis.labels.style.color = font_color;
      styled_chart.xAxis.gridLineColor = axis_color;
      styled_chart.xAxis.lineColor = axis_color;
      styled_chart.xAxis.tickColor = axis_color;

      styled_chart.yAxis[0].labels.style.color = axis_color;
      styled_chart.yAxis[0].stackLabels.style.color = font_color;
      styled_chart.yAxis[0].gridLineColor = axis_color;
      styled_chart.yAxis[0].lineColor = axis_color;
      styled_chart.yAxis[0].tickColor = axis_color;
      styled_chart.yAxis[0].title.style.color = axis_color;

      styled_chart.yAxis[1].labels.style.color = axis_color;
      styled_chart.yAxis[1].stackLabels.style.color = font_color;
      styled_chart.yAxis[1].gridLineColor = axis_color;
      styled_chart.yAxis[1].lineColor = axis_color;
      styled_chart.yAxis[1].tickColor = axis_color;
      styled_chart.yAxis[1].title.style.color = axis_color;

      styled_chart.credits.style.color = font_color;

      return styled_chart;
    }
  }

  /**
   * Is the current website bloodmallet.com?
   * @returns true if current website is bloodmallet.com or a dev environment.
   */
  function is_bloodmallet_dot_com() {
    return ["bloodmallet.com", "127.0.0.1:8000"].includes(window.location.host);
  }

  /**
   * Create an all-meta-data information area
   * @param {*} state
   * @param {*} data
   */
  function provide_meta_data(state, data) {
    if (!is_bloodmallet_dot_com()) {
      return
    }
    if (debug) {
      console.log("provide_meta_data");
    }

    // value switch
    if (["trinkets", "covenants", "conduits", "soulbind_nodes", "windfury_totem", "power_infusion"].includes(state.data_type)) {
      let element = document.getElementById("value_style_switch")
      if (element !== undefined && element !== null) {
        element.hidden = false;
      }
    }

    // chart options

    let element = document.getElementById("meta-info");
    if (element !== undefined && element !== null) {
      element.hidden = false;
    }

    // SimulationCraft settings
    for (let setting in data["simc_settings"]) {
      let text = document.createTextNode(data["simc_settings"][setting]);
      let parent = document.getElementById("c_" + setting);
      if (parent !== undefined && parent !== null) {
        parent.innerText = "";
        parent.appendChild(text);
      }
    }

    // redo simc hash properly
    let simc_link = document.createElement("a");
    simc_link.href = "https://github.com/simulationcraft/simc/commit/" + data?.simc_settings?.simc_hash;
    simc_link.innerText = data?.simc_settings?.simc_hash?.substring(0, 7);
    let simc_hash = document.getElementById("c_simc_hash")
    if (simc_hash !== undefined && simc_hash !== null) {
      simc_hash.innerText = "";
      simc_hash.appendChild(simc_link);
    }

    // character profile - character
    if (Object.keys(data).indexOf("profile") > -1) {
      for (let character_key in data["profile"]["character"]) {
        try {
          let c_entry = document.getElementById("c_" + character_key);
          if (c_entry !== undefined && c_entry !== null) {

            c_entry.innerHTML = "";
            let text = undefined;
            if (character_key === "soulbind") {
              text = document.createTextNode(data["profile"]["character"][character_key].replaceAll(",", " ").replaceAll("/", " "));
            } else {
              text = document.createTextNode(title(data["profile"]["character"][character_key]));
            }
            c_entry.appendChild(text);
          }
        } catch (error) {
        }
      }

      // redo talents properly
      const talents = data["profile"]["character"]["talents"] !== undefined ? data["profile"]["character"]["talents"] : "0000000";
      let talents_element = document.getElementById("c_talents");
      if (talents_element !== undefined && talents_element !== null) {
        talents_element.innerHTML = "";
        talents_element.appendChild(create_talent_iframe(talents, "base"));
      }

      // character profile - items
      for (let item_key in data["profile"]["items"]) {
        let icon = document.createElement("a");
        icon.href = "";
        icon.href = "https://" + (state.language === "en" ? "www" : state.language) + ".wowhead.com/";
        icon.href += "item=" + data["profile"]["items"][item_key]["id"];
        let boni = [];
        try {
          boni.push("bonus=" + data["profile"]["items"][item_key]["bonus_id"].split("/").join(":"));
        } catch (error) { }
        try {
          if (data["profile"]["items"][item_key].hasOwnProperty("ilevel")) {
            boni.push("ilvl=" + data["profile"]["items"][item_key]["ilevel"]);
          }
        } catch (error) { }
        if (boni.length > 0) {
          icon.href += "?" + boni.join("&");
        }

        icon.dataset.whIconSize = "medium";
        //icon.dataset.whRenameLink = true;
        let item = document.getElementById("c_" + item_key);
        if (item !== undefined && item !== null) {
          item.innerHTML = "";
          item.appendChild(icon);
        }
      }
    } else {
      let element = document.getElementById("character-profile-label");
      if (element !== undefined && element !== null) {
        element.hidden = true;
      }
    }

    // show all used talent trees for talent related simulations
    if (["tier_set", "talent_target_scaling"].indexOf(state.data_type) > -1) {
      let post_chart = document.getElementById("post_chart");
      if (post_chart !== undefined && post_chart !== null) {
        post_chart.hidden = false;
      }

      let base_element = document.getElementById("talent-information-div");
      // generate talent tree iframes only once
      if (base_element !== undefined && base_element !== null && base_element.textContent === "") {
        for (const override_profile_name of Object.keys(data["data_profile_overrides"])) {
          const override_profile_data = data["data_profile_overrides"][override_profile_name];

          const profile_index = data["sorted_data_keys"].indexOf(override_profile_name);

          let headline = document.createElement("h3");
          headline.appendChild(document.createTextNode(override_profile_name));
          headline.id = "override-profile-" + profile_index;
          base_element.appendChild(headline);

          let talent_string = "";
          for (const element of override_profile_data) {
            if (element.startsWith("talents=")) {
              talent_string = element.split("=")[1];
            }
          }

          let iframe = create_talent_iframe(talent_string, override_profile_name);
          base_element.appendChild(iframe);
        }
      }
    }

    // soulbind covenant listing of used nodes
    if (state.data_type === "soulbinds") {
      let parent = document.getElementById("post_chart");
      parent.hidden = false;
      parent.innerHTML = "";

      Object.keys(data["covenant_ids"]).forEach(covenant => {
        const id = data["covenant_ids"][covenant];

        let headline = document.createElement("h3");
        headline.appendChild(document.createTextNode(get_translated_name(covenant, data, state)));
        parent.appendChild(headline);

        let order = 0;
        const sorted_soulbinds = data["sorted_data_keys"];
        for (const soulbind of sorted_soulbinds) {
          if (data["covenant_mapping"][soulbind].indexOf(id) > -1) {
            order += 1;

            let s_headline = document.createElement("h4");
            s_headline.appendChild(document.createTextNode(order + ". " + get_translated_name(soulbind, data, state)));
            s_headline.classList += "ml-3";
            s_headline.id = soulbind;
            parent.appendChild(s_headline);

            let nodes = document.createElement("p");
            nodes.classList += "ml-5";
            let collect = [];
            const max_dps_path = getKeyByValue(data["data"][soulbind], Math.max(...Object.values(data["data"][soulbind]))).split("+");
            for (const node of max_dps_path) {
              let a = document.createElement("a");
              a.href = "https://" + (state.language === "en" ? "www" : state.language) + ".wowhead.com/";
              if (data.hasOwnProperty("spell_ids") && data["spell_ids"].hasOwnProperty(node)) {
                a.href += "spell=" + data["spell_ids"][node] + '/' + slugify(node);
              }
              a.appendChild(document.createTextNode(get_translated_name(node, data, state)));
              collect.push(a);
            }
            for (let i = 0; i < collect.length; i++) {
              if (i !== 0) {
                nodes.appendChild(document.createTextNode(", "));
              }
              nodes.appendChild(collect[i]);
            }
            parent.appendChild(nodes);
          }
        }

      });

      // create soulbind charts
      setTimeout(() => {
        Object.keys(data["covenant_ids"]).forEach(covenant => {
          const id = data["covenant_ids"][covenant];

          let headline = document.createElement("h3");
          headline.appendChild(document.createTextNode(get_translated_name(covenant, data, state)));
          parent.appendChild(headline);

          let order = 0;
          const sorted_soulbinds = data["sorted_data_keys"];
          for (const soulbind of sorted_soulbinds) {
            if (data["covenant_mapping"][soulbind].indexOf(id) > -1) {
              order += 1;

              let s_headline = document.createElement("h4");
              s_headline.appendChild(document.createTextNode(order + ". " + get_translated_name(soulbind, data, state)));
              s_headline.classList += "ml-3";
              s_headline.id = soulbind;
              parent.appendChild(s_headline);

              // collect sorted data
              let dps_values = Object.values(data["data"][soulbind]).sort((a, b) => { return b - a; });
              let descending_names = dps_values.map(value => { return getKeyByValue(data["data"][soulbind], value) });

              // create chart
              let chart = document.createElement("div");
              // add data to chart
              let new_chart = Highcharts.chart(chart, update_chart_style(state))

              new_chart.title.attr({ text: "" });
              new_chart.subtitle.attr({ text: "" });

              let linked_names = descending_names.map(name => {
                let name_parts = name.split("+");

                let new_name = name_parts.reduce((p_value, c_value) => {
                  let a = document.createElement("a");
                  a.href = "https://" + (state.language === "en" ? "www" : state.language) + ".wowhead.com/";
                  a.href += "spell=" + data["spell_ids"][c_value] + '/' + slugify(c_value);
                  // a.appendChild(document.createTextNode(get_translated_name(c_value, data, state)));
                  // a.appendChild(document.createTextNode(" "));

                  return p_value + a.outerHTML;

                }, "");
                return new_name;
              });

              new_chart.update({
                xAxis: {
                  categories: linked_names,
                  labels: { step: 1 }
                }
              }, false);

              new_chart.addSeries({
                data: dps_values,
                color: covenants[covenant]["color"],
                showInLegend: false,
              }, false);

              // append chart
              parent.appendChild(chart);

              new_chart.redraw();

              setTimeout(() => {
                chart.style.height = 200 + descending_names.length * 30 + "px";
                new_chart.setSize(undefined, chart.style.height);
              }, 100);
            }
          }

        });
      }, 5);

    }

    // add filters
    // trinkets
    if (state.data_type === "trinkets") {
      // itemlevels
      let parent_itemlevels = document.getElementById("filter-itemlevels-options");
      if (parent_itemlevels !== undefined && parent_itemlevels !== null) {
        parent_itemlevels.innerHTML = "";
        let chart = document.getElementById("chart");
        for (let itemlevel of data["simulated_steps"]) {
          let step = "step_" + itemlevel;
          let form_check = document.createElement("div");
          form_check.className += " form-check";

          let input = document.createElement("input");
          input.className += " form-check-input";
          input.className += " filter-itemlevels";
          input.type = "checkbox";
          input.id = step;
          input.value = itemlevel;
          if (chart.dataset.filterItemlevels === undefined) {
            input.checked = true;
          } else {
            input.checked = chart.dataset.filterItemlevels.split(";").indexOf(itemlevel.toString()) === -1;
          }

          form_check.appendChild(input);

          let label = document.createElement("label");
          label.className = " form-check-label"
          label.htmlFor = step;
          label.appendChild(document.createTextNode(itemlevel));

          form_check.appendChild(label);

          parent_itemlevels.appendChild(form_check);

          input.addEventListener("change", (element, event) => {
            set_itemlevel_filter(element.target.value, element.target.checked);
            bloodmallet_chart_import();
          });
        }
      }

      // sources
      let parent_sources = document.getElementById("filter-sources-options");
      if (parent_sources !== undefined && parent_sources !== null) {
        parent_sources.innerHTML = "";
        // unique sources
        let sources = Object.values(data["data_sources"]).filter((item, i, ar) => ar.indexOf(item) === i).sort();
        for (let source of sources) {
          let step = "step_" + source.replaceAll(" ", "_");
          let form_check = document.createElement("div");
          form_check.className += " form-check";

          let input = document.createElement("input");
          input.className += " form-check-input";
          input.className += " filter-sources";
          input.type = "checkbox";
          input.id = step;
          input.value = source;
          if (chart.dataset.filterSources === undefined) {
            input.checked = true;
          } else {
            input.checked = chart.dataset.filterSources.split(";").indexOf(source.toString()) === -1;
          }

          form_check.appendChild(input);

          let label = document.createElement("label");
          label.className = " form-check-label"
          label.htmlFor = step;
          label.appendChild(document.createTextNode(source));

          form_check.appendChild(label);

          parent_sources.appendChild(form_check);

          input.addEventListener("change", (element, event) => {
            set_source_filter(element.target.value, element.target.checked);
            bloodmallet_chart_import();
          });
        }
      }
    }

    try {
      $WowheadPower.refreshLinks();
    } catch (error) { }
  }

  function set_itemlevel_filter(value, checked) {
    let chart = document.getElementById("chart");
    let itemlevel_filters = chart.dataset.filterItemlevels;
    // remove from filter
    if (checked) {
      chart.dataset.filterItemlevels = itemlevel_filters.split(";").filter(v => v !== value).join(";");
    } else { // add to filter
      if (itemlevel_filters === undefined || itemlevel_filters.length === 0) {
        chart.dataset.filterItemlevels = value;
      } else {
        chart.dataset.filterItemlevels = itemlevel_filters + ";" + value;
      }
    }
  }

  function set_source_filter(value, checked) {
    let chart = document.getElementById("chart");
    let source_filters = chart.dataset.filterSources;
    // remove from filter
    if (checked) {
      chart.dataset.filterSources = source_filters.split(";").filter(v => v !== value).join(";");
    } else { // add to filter
      if (source_filters === undefined || source_filters.length === 0) {
        chart.dataset.filterSources = value;
      } else {
        chart.dataset.filterSources = source_filters + ";" + value;
      }
    }
  }

  /**
   *
   * @param {String} string
   */
  function title(string) {
    return string.split(" ").map(e => { return e[0].toUpperCase() + e.substring(1) }).join(" ");
  }

  /**
   *
   * @param {String} string
   */
  function snake_case_to_title(string) {
    return string.split("_").map(e => { return e[0].toUpperCase() + e.substring(1) }).join(" ");
  }

  function create_talent_iframe(talent_string, title) {
    let width = 750;
    let height = 475;
    let iframe = document.createElement("iframe");
    iframe.title = title;
    iframe.width = width + 10;
    iframe.height = height;
    iframe.src = "https://www.raidbots.com/simbot/render/talents/" + talent_string + "?width=" + width;

    return iframe;
  }

  /**
   * Get the translation of a name (item, trait, race) from the data file
   * @param {string} name
   */
  function get_translated_name(name, data, state) {
    if (debug) {
      console.log("get_translated_name " + name);
    }

    let return_name = "";
    try {
      return_name = data["translations"][name][language_table[state.language]];
    } catch (error) {
      if (debug) {
        console.log(`No translation for ${name} found.`);
        console.log(error);
      }
      return_name = name;
    }

    if (debug) {
      console.log("Translated name: " + return_name);
    }

    if (return_name === undefined) {
      return_name = name;
    }

    // shorten name
    // Darkmoon Deck Box: Dance [Emberscale] => DDB:D [Emberscale]
    // if (return_name.length > 30) {
    //   let actual_name = return_name;
    //   if (return_name.split("[").length == 2) {
    //     actual_name = return_name.split("[")[0];
    //   }
    //   let new_name = actual_name.split(": ").map(name_part => name_part.split(" ").map(e => e[0]).join("")).join(":");
    //   if (return_name.split("[").length == 2) {
    //     new_name += " [" + return_name.split("[")[1];
    //   }
    //   return_name = new_name;
    // }

    return return_name;
  }

  function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
  }

  /**
   * Get the translation of a name (item, trait, race) from the data file
   */
  function get_base_name_from_translation(name, data, state) {
    if (debug) {
      console.log("get_base_name_from_translation " + name);
    }

    for (let base_name of Object.keys(data["translations"])) {
      if (language_table[state.language] === getKeyByValue(data["translations"][base_name], name)) {
        if (debug) {
          console.log("Base name: " + base_name);
        }
        return base_name;
      }
    }
    return name;
  }
}

async function updateTrinketChart(itemName, itemLevel, fightStyle) {

  const cacheKey = `${fightStyle}-${itemName}-${itemLevel}`;
  const chartData = trinketDataCache[cacheKey];

  // Sort and filter the data as needed
  // Pass the data to the chart rendering function
  update_chart(state, html_element, chart, count);
}

window.updateTrinketChart = updateTrinketChart;

// Load data on document load
document.addEventListener("DOMContentLoaded", function () {
  bloodmallet_chart_import();
});
