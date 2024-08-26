if (typeof debug === 'undefined') {
    var debug = false;
}
document.addEventListener("DOMContentLoaded", function () {
    if (debug) {
        console.log("DOMContentLoaded");
    }
    update_navbarClassMenu(get_state());
});

/**
 * Checks url pathname for data and returns all provided information or default values.
 */
function get_state() {
    if (debug) {
        console.log("update_state_from_path");
    }
    let path = window.location.pathname;
    let state = {};
    [
        state.wow_class,
        state.wow_spec,
        state.simulation_type,
        state.fight_style
    ] = path.split("/").slice(2, 6);
    return state;
}

function update_navbarClassMenu(state) {
    if (debug) {
        console.log("update_navbarClassMenu");
    }
    const simulation_type_dict = {
        "phials": "Phials",
        "potions": "Potions",
        "races": "Races",
        "secondary_distributions": "Secondary Distributions",
        "talent_target_scaling": "Talent Target Scaling",
        // "tier_set": "Tier Sets",
        "trinkets": "Trinkets",
        "weapon_enchantments": "Weapon Enchantments",
    };
    const simulation_types = Object.keys(simulation_type_dict).sort();
    const fight_style_dict = {
        "castingpatchwerk": "Casting Patchwerk 1 target",
        "castingpatchwerk3": "Casting Patchwerk 3 targets",
        "castingpatchwerk5": "Casting Patchwerk 5 targets",
    };
    const fight_styles = Object.keys(fight_style_dict).sort();

    let navbarClassMenu = document.getElementById("navbarClassMenu");

    let ul_nav = document.createElement("ul");
    ul_nav.className = "navbar-nav";

    // add class selection (dropdown)
    // create base element with selected class
    let li_nav_item_class = document.createElement("li");
    li_nav_item_class.className = "nav-item dropdown";

    let a_nav_link = document.createElement("a");
    a_nav_link.className = "nav-link dropdown-toggle " + state.wow_class + "-color " + state.wow_class + "-menu-border";
    a_nav_link.href = "#";
    a_nav_link.role = "button";
    a_nav_link.setAttribute("data-bs-toggle", "dropdown");
    // a_nav_link.setAttribute("aria-haspopup", "true");
    a_nav_link.setAttribute("aria-expanded", "false");
    a_nav_link.id = "navbar_wow_class_selection";

    a_nav_link.innerText = capitalize_first_letters(state.wow_class).replace("_", " ");
    li_nav_item_class.appendChild(a_nav_link);
    ul_nav.appendChild(li_nav_item_class);

    // create drop down div
    let div_dropdown = document.createElement("div");
    div_dropdown.className = "dropdown-menu " + state.wow_class + "-border-top";
    div_dropdown.setAttribute("aria-labelledby", "navbar_wow_class_selection");

    for (tmp_class of Object.keys(classes_specs)) {
        if ([
            "death_knight",
            "demon_hunter",
            "druid",
            "evoker",
            "hunter",
            "mage",
            "monk",
            "paladin",
            "priest",
            "rogue",
            "shaman",
            "warlock",
            "warrior",
        ].indexOf(tmp_class) === -1) {
            continue;
        }

        let a_nav_link = document.createElement("a");
        a_nav_link.className = "dropdown-item " + tmp_class + "-button";
        a_nav_link.href = "/" + ["chart", tmp_class, classes_specs[tmp_class][0], state.simulation_type, state.fight_style].join("/");
        a_nav_link.id = "navbar_" + tmp_class + "_selector";
        a_nav_link.innerText = capitalize_first_letters(tmp_class).replace("_", " ");
        div_dropdown.appendChild(a_nav_link);
    }

    // add all classes to the dropdown
    li_nav_item_class.appendChild(div_dropdown);

    // wow specs
    let li_nav_item_spec = document.createElement("li");
    li_nav_item_spec.className = "nav-item dropdown";
    ul_nav.appendChild(li_nav_item_spec);
    let a_nav_link_spec = document.createElement("a");
    a_nav_link_spec.className = "nav-link dropdown-toggle " + state.wow_class + "-color " + state.wow_class + "-menu-border";
    a_nav_link_spec.href = "";
    a_nav_link_spec.setAttribute("data-bs-toggle", "dropdown");
    // a_nav_link_spec.setAttribute("aria-haspopup", "true");
    a_nav_link_spec.setAttribute("aria-expanded", "false");
    a_nav_link_spec.id = "navbar_wow_spec_selection";

    a_nav_link_spec.innerText = capitalize_first_letters(state.wow_spec).replace("_", " ");
    li_nav_item_spec.appendChild(a_nav_link_spec);

    // create drop down div
    let div_dropdown_spec = document.createElement("div");
    div_dropdown_spec.className = "dropdown-menu " + state.wow_class + "-border-top";
    div_dropdown_spec.setAttribute("aria-labelledby", "navbar_wow_spec_selection");

    for (tmp_spec of classes_specs[state.wow_class]) {
        // build navv for these specs
        if ([
            // "death_knight_blood",
            // "death_knight_frost",
            "death_knight_unholy",
            // "demon_hunter_havoc",
            "demon_hunter_vengeance",
            // "druid_balance",
            // "druid_feral",
            // "druid_guardian",
            // "druid_restoration",
            // "evoker_devastation",
            // "evoker_preservation",
            // "evoker_augmentation",
            // "hunter_beast_mastery",
            // "hunter_marksmanship",
            // "hunter_survival",
            // "mage_arcane",
            // "mage_fire",
            // "mage_frost",
            // "monk_brewmaster",
            // "monk_windwalker",
            // "monk_mistweaver",
            // "paladin_protection",
            // "paladin_retribution",
            // "paladin_holy",
            "priest_shadow",
            // "priest_holy",
            // "priest_discipline",
            // "rogue_assassination",
            "rogue_outlaw",
            // "rogue_subtlety",
            "shaman_elemental",
            "shaman_enhancement",
            // "shaman_restoration",
            // "warlock_affliction",
            // "warlock_demonology",
            // "warlock_destruction",
            // "warrior_arms",
            // "warrior_fury",
            // "warrior_protection"
        ].indexOf(state.wow_class + "_" + tmp_spec) === -1) {
            continue;
        }
        let a_nav_link = document.createElement("a");
        a_nav_link.className = "dropdown-item " + state.wow_class + "-button";
        a_nav_link.href = "/" + ["chart", state.wow_class, tmp_spec, state.simulation_type, state.fight_style].join("/");
        a_nav_link.id = "navbar_" + tmp_spec + "_selector";
        a_nav_link.innerText = capitalize_first_letters(tmp_spec).replace("_", " ");
        div_dropdown_spec.appendChild(a_nav_link);
    }

    // add simulation_type to the dropdown
    li_nav_item_spec.appendChild(div_dropdown_spec);

    // simulation type
    let li_nav_item_simulation_type = document.createElement("li");
    li_nav_item_simulation_type.className = "nav-item dropdown";
    ul_nav.appendChild(li_nav_item_simulation_type);
    let a_nav_link_simulation_type = document.createElement("a");
    a_nav_link_simulation_type.className = "nav-link dropdown-toggle " + state.wow_class + "-color " + state.wow_class + "-menu-border";
    a_nav_link_simulation_type.href = "";
    a_nav_link_simulation_type.setAttribute("data-bs-toggle", "dropdown");
    // a_nav_link_simulation_type.setAttribute("aria-haspopup", "true");
    a_nav_link_simulation_type.setAttribute("aria-expanded", "false");
    a_nav_link_simulation_type.id = "navbar_simulation_type_selection";

    a_nav_link_simulation_type.innerText = simulation_type_dict[state.simulation_type];
    li_nav_item_simulation_type.appendChild(a_nav_link_simulation_type);

    // create drop down div
    let div_dropdown_simulation_type = document.createElement("div");
    div_dropdown_simulation_type.className = "dropdown-menu " + state.wow_class + "-border-top";
    div_dropdown_simulation_type.setAttribute("aria-labelledby", "navbar_simulation_type_selection");

    for (tmp_type of simulation_types) {
        let a_nav_link = document.createElement("a");
        a_nav_link.className = "dropdown-item " + state.wow_class + "-button";
        a_nav_link.href = "/" + ["chart", state.wow_class, state.wow_spec, tmp_type, state.fight_style].join("/");
        a_nav_link.id = "navbar_" + tmp_type + "_selector";
        a_nav_link.innerText = simulation_type_dict[tmp_type];
        div_dropdown_simulation_type.appendChild(a_nav_link);
    }

    // add simulation_type to the dropdown
    li_nav_item_simulation_type.appendChild(div_dropdown_simulation_type);

    // fight style
    let li_nav_item_fight_style = document.createElement("li");
    li_nav_item_fight_style.className = "nav-item dropdown";
    ul_nav.appendChild(li_nav_item_fight_style);
    let a_nav_link_fight_style = document.createElement("a");
    a_nav_link_fight_style.className = "nav-link dropdown-toggle " + state.wow_class + "-color " + state.wow_class + "-menu-border";
    a_nav_link_fight_style.href = "";
    a_nav_link_fight_style.setAttribute("data-bs-toggle", "dropdown");
    // a_nav_link_fight_style.setAttribute("aria-haspopup", "true");
    a_nav_link_fight_style.setAttribute("aria-expanded", "false");
    a_nav_link_fight_style.id = "navbar_fight_style_selection";

    a_nav_link_fight_style.innerText = fight_style_dict[state.fight_style];
    li_nav_item_fight_style.appendChild(a_nav_link_fight_style);

    // create drop down div
    let div_dropdown_fight_style = document.createElement("div");
    div_dropdown_fight_style.className = "dropdown-menu " + state.wow_class + "-border-top";
    div_dropdown_fight_style.setAttribute("aria-labelledby", "navbar_fight_style_selection");

    for (tmp_style of fight_styles) {
        let a_nav_link = document.createElement("a");
        a_nav_link.className = "dropdown-item " + state.wow_class + "-button";
        a_nav_link.href = "/" + ["chart", state.wow_class, state.wow_spec, state.simulation_type, tmp_style].join("/");
        a_nav_link.id = "navbar_" + tmp_style + "_selector";
        a_nav_link.innerText = fight_style_dict[tmp_style];
        div_dropdown_fight_style.appendChild(a_nav_link);
    }

    // add simulation_type to the dropdown
    li_nav_item_fight_style.appendChild(div_dropdown_fight_style);

    // replace old navigation with new styled one
    while (navbarClassMenu.firstChild) {
        navbarClassMenu.removeChild(navbarClassMenu.firstChild);
    }
    navbarClassMenu.appendChild(ul_nav);

}

/**
 * Capitalize all first letters in a string.
 * Example: string_test -> String_Test
 */
function capitalize_first_letters(string) {
    if (debug) {
        console.log("capitalize_first_letters");
    }
    let new_string = string.charAt(0).toUpperCase();
    if (string.indexOf("_") > -1) {
        new_string += string.slice(1, string.indexOf("_") + 1);
        new_string += capitalize_first_letters(string.slice(string.indexOf("_") + 1));
    } else {
        new_string += string.slice(1);
    }
    return new_string;
}
