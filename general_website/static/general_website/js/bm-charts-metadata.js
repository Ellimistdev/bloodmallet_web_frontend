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

    // value switch
    if (["trinkets", "windfury_totem", "power_infusion"].includes(state.data_type)) {
        let element = document.getElementById("value_style_switch");
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
    simc_link.href = "https://github.com/simulationcraft/simc/commit/" + data["simc_settings"]["simc_hash"];
    simc_link.innerText = data["simc_settings"]["simc_hash"].substring(0, 7);
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
                if (chart.dataset.filterTrinketItemlevels === undefined) {
                    input.checked = true;
                } else {
                    input.checked = chart.dataset.filterTrinketItemlevels.split(";").indexOf(itemlevel.toString()) === -1;
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
                    bm_import_charts();
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
                if (chart.dataset.filterTrinketSources === undefined) {
                    input.checked = true;
                } else {
                    input.checked = chart.dataset.filterTrinketSources.split(";").indexOf(source.toString()) === -1;
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
                    bm_import_charts();
                });
            }
        }

        // active / passive
        document.getElementsByName("filter-active-passive").forEach(element => {
            element.addEventListener("change", (element, event) => {
                set_active_passive_filter(element.target.value, element.target.checked);
                // bloodmallet_chart_import();
                bm_import_charts();
            });
        });
    }

    try {
        $WowheadPower.refreshLinks();
    } catch (error) { }

    publish_raw_data(state, data);

}

function publish_raw_data(bm_chart_data, loaded_data) {
    document.getElementById(bm_chart_data.root_element.id + "_raw_data").value = JSON.stringify(loaded_data, null, "    ");
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

function set_itemlevel_filter(value, checked) {
    let chart = document.getElementById("chart");
    let itemlevel_filters = chart.dataset.filterTrinketItemlevels;
    // remove from filter
    if (checked) {
        chart.dataset.filterTrinketItemlevels = itemlevel_filters.split(";").filter(v => v !== value).join(";");
    } else { // add to filter
        if (itemlevel_filters === undefined || itemlevel_filters.length === 0) {
            chart.dataset.filterTrinketItemlevels = value;
        } else {
            chart.dataset.filterTrinketItemlevels = itemlevel_filters + ";" + value;
        }
    }
}

function set_source_filter(value, checked) {
    let chart = document.getElementById("chart");
    let source_filters = chart.dataset.filterTrinketSources;
    // remove from filter
    if (checked) {
        chart.dataset.filterTrinketSources = source_filters.split(";").filter(v => v !== value).join(";");
    } else { // add to filter
        if (source_filters === undefined || source_filters.length === 0) {
            chart.dataset.filterTrinketSources = value;
        } else {
            chart.dataset.filterTrinketSources = source_filters + ";" + value;
        }
    }
}

function set_active_passive_filter(value, checked) {
    const chart = document.getElementById("chart");
    let active_passive_filters = chart.dataset.filterTrinketActivePassive;
    // remove from filter
    if (checked) {
        chart.dataset.filterTrinketActivePassive = active_passive_filters.split(";").filter(v => v !== value).join(";");
    } else { // add to filter
        if (active_passive_filters === undefined || active_passive_filters.length === 0) {
            chart.dataset.filterTrinketActivePassive = value;
        } else {
            chart.dataset.filterTrinketActivePassive = active_passive_filters + ";" + value;
        }
    }
}
