if (typeof debug === 'undefined') {
    var debug = false;
}

document.addEventListener("DOMContentLoaded", function () {
    if (debug) {
        console.log("DOMContentLoaded");
    }
    update_navbarTrinketMenu(get_state());
});

const fight_style_dict = {
    "castingpatchwerk": "Casting Patchwerk 1 target",
    "castingpatchwerk3": "Casting Patchwerk 3 targets",
    "castingpatchwerk5": "Casting Patchwerk 5 targets",
};
const fight_styles = Object.keys(fight_style_dict).sort();

const item_levels = [
    "447", 
    "450",
    "454",
    "463",
    "476",
    "480",
    "483",
    "486",
    "489"
];

const trinkets_s3 = [
    "accelerating_sandglass",
    "alacritous_alchemist_stone",
    "algeth'ar_puzzle_box",
    "ashes_of_the_embersoul",
    "augury_of_the_primal_flame",
    "balefire_branch",
    "beacon_to_the_beyond",
    "branch_of_the_tormented_ancient",
    "caged_horror",
    "cataclysmic_signet_brand",
    "coiled_serpent_idol",
    "corrupted_starlight",
    "darkmoon_deck_box:_dance",
    "darkmoon_deck_box:_dance_[azurescale]",
    "darkmoon_deck_box:_dance_[bronzescale]",
    "darkmoon_deck_box:_dance_[emberscale]",
    "darkmoon_deck_box:_dance_[jetscale]",
    "darkmoon_deck_box:_dance_[none]",
    "darkmoon_deck_box:_dance_[sagescale]",
    "darkmoon_deck_box:_inferno",
    "darkmoon_deck_box:_inferno_[azurescale]",
    "darkmoon_deck_box:_inferno_[bronzescale]",
    "darkmoon_deck_box:_inferno_[emberscale]",
    "darkmoon_deck_box:_inferno_[jetscale]",
    "darkmoon_deck_box:_inferno_[none]",
    "darkmoon_deck_box:_inferno_[sagescale]",
    "darkmoon_deck_box:_rime",
    "darkmoon_deck_box:_rime_[azurescale]",
    "darkmoon_deck_box:_rime_[bronzescale]",
    "darkmoon_deck_box:_rime_[emberscale]",
    "darkmoon_deck_box:_rime_[jetscale]",
    "darkmoon_deck_box:_rime_[none]",
    "darkmoon_deck_box:_rime_[sagescale]",
    "darkmoon_deck_box:_watcher",
    "elementium_pocket_anvil",
    "ember_of_nullification",
    "enduring_dreadplate",
    "frenzying_signoll_flare",
    "fyrakk's_tainted_rageheart",
    "gift_of_ursine_vengeance",
    "gore-crusted_butcher's_block",
    "heart_of_thunder",
    "homeland_raid_horn",
    "idol_of_the_dreamer",
    "idol_of_the_earth-warder",
    "idol_of_the_life-binder",
    "idol_of_the_spell-weaver",
    "irideus_fragment",
    "lingering_sporepods",
    "mark_of_dargrul",
    "might_of_the_ocean",
    "mirror_of_fractured_tomorrows",
    "mutated_magmammoth_scale",
    "naraxas'_spiked_tongue",
    "neltharion's_call_to_suffering",
    "nightmare_egg_shell",
    "obsidian_gladiator's_badge_of_ferocity",
    "obsidian_gladiator's_emblem",
    "obsidian_gladiator's_insignia_of_alacrity",
    "obsidian_gladiator's_medallion",
    "obsidian_gladiator's_sigil_of_adaptation",
    "ominous_chromatic_essence_[azure+all]",
    "ominous_chromatic_essence_[azure]",
    "ominous_chromatic_essence_[bronze+all]",
    "ominous_chromatic_essence_[bronze]",
    "ominous_chromatic_essence_[emerald+all]",
    "ominous_chromatic_essence_[emerald]",
    "ominous_chromatic_essence_[obsidian+all]",
    "ominous_chromatic_essence_[obsidian]",
    "ominous_chromatic_essence_[ruby+all]",
    "ominous_chromatic_essence_[ruby]",
    "paracausal_fragment_of_azzinoth",
    "paracausal_fragment_of_doomhammer",
    "paracausal_fragment_of_frostmourne",
    "paracausal_fragment_of_shalamayne",
    "paracausal_fragment_of_sulfuras",
    "paracausal_fragment_of_thunderfin,_humid_blade_of_the_tideseeker",
    "pip's_emerald_friendship_badge",
    "porcelain_crab",
    "prophetic_stonescales",
    "rezan's_gleaming_eye",
    "screaming_black_dragonscale",
    "shard_of_rokmora",
    "spiked_counterweight",
    "spores_of_alacrity",
    "sustaining_alchemist_stone",
    "time-breaching_talon",
    "treemouth's_festering_splinter",
    "vial_of_animated_blood",
    "ward_of_faceless_ire",
    "zaqali_chaos_grapnel",
    "baseline",
    "bandolier_of_twisted_blades",
    "dragonfire_bomb_dispenser",
    "erupting_spear_fragment",
    "globe_of_jagged_ice",
    "harlan's_loaded_dice",
    "idol_of_pure_decay",
    "igneous_flowstone_[high_tide]",
    "igneous_flowstone_[low_tide]",
    "my'das_talisman",
    "neltharion's_call_to_chaos",
    "oakheart's_gnarled_root",
    "witherbark's_branch",
    "belor'relos,_the_suncaller",
    "coagulated_genesaur_blood",
    "echoing_tyrstone",
    "lady_waycrest's_music_box",
    "nymue's_unraveling_spindle",
    "paracausal_fragment_of_seschenal",
    "paracausal_fragment_of_val'anyr",
    "rotcrusted_voodoo_doll",
    "sea_star",
    "spoils_of_neltharus",
    "time-thief's_gambit",
    "vessel_of_searing_shadow",
    "vessel_of_skittering_shadows",
    "neltharion's_call_to_dominance"
];

/**
 * Checks url pathname for data and returns all provided information or default values.
 */
function get_state() {
    if (debug) {
        console.log("update_state_from_path");
    }

    const path = window.location.pathname;
    const [simulation_type, item_name, item_level, fight_style] = path.split("/").slice(2, 6);
    return { simulation_type, item_name, item_level, fight_style };
}

function update_navbarTrinketMenu(state) {
    if (debug) {
        console.log("update_navbarTrinketMenu");
    }

    // set defaults
    state.item_name ??= trinkets_s3[0];
    state.item_level ??= item_levels[0];
    state.fight_style ??= fight_styles[0];
    state.wow_class = "rogue";


    const navbarTrinketMenu = document.getElementById("navbarTrinketMenu");
    const ul_nav = document.createElement("ul");
    ul_nav.className = "navbar-nav";

    const createDropdownMenu = (label, id, value) => {
        const li = document.createElement("li");
        li.className = "nav-item dropdown";
        ul_nav.appendChild(li);

        const a = document.createElement("a");
        a.className = `nav-link dropdown-toggle ${state.wow_class}-color ${state.wow_class}-menu-border`;
        a.href = "";
        a.setAttribute("data-toggle", "dropdown");
        a.setAttribute("aria-haspopup", "true");
        a.setAttribute("aria-expanded", "false");
        a.id = `navbar_${id}_selection`;
        a.innerText = label;
        li.appendChild(a);

        const divDropdown = createDropdownMenuEntries(value, id, state);
        li.appendChild(divDropdown);
    }

    // Add trinket selection (dropdown)
    createDropdownMenu(formatText(state.item_name, "item_name"), "item_name", trinkets_s3 );

    // Add item level selection (dropdown)
    createDropdownMenu(formatText(state.item_level, "item_level"), "item_level", item_levels );

    // Add fight style selection (dropdown)
    createDropdownMenu(fight_style_dict[state.fight_style], "fight_style", fight_styles);

    // replace old navigation with new styled one
    while (navbarTrinketMenu.firstChild) {
        navbarTrinketMenu.removeChild(navbarTrinketMenu.firstChild);
    }
    navbarTrinketMenu.appendChild(ul_nav);
}

const formatLink = (item, id, state) => {
    const parts = ["chart", state.simulation_type, state.item_name, state.item_level, state.fight_style];
    
    switch (id) {
        case "item_name":
            parts[2] = item;
            break;
        case "item_level":
            parts[3] = item;
            break;
        case "fight_style":
            parts[4] = item;
            break;
    }

    return "/" + parts.join("/");
}

const formatText = (item, id) => {
    switch (id) {
        case "item_name":
        case "item_level":
            return capitalize_first_letters(item).replaceAll("_", " ");
        case "fight_style":
            return fight_style_dict[item];
        default:
            return item;
    }
}

const createDropdownMenuEntries = (items, id, state) => {
    const dropdownMenu = document.createElement("div");
    dropdownMenu.className = `dropdown-menu ${state.wow_class}-border-top`;
    dropdownMenu.setAttribute("aria-labelledby", `navbar_${id}_selection`);

    const dropdownItems = items.map((item) => {
        const a = document.createElement("a");
        a.className = `dropdown-item ${state.wow_class}-button`;
        a.href = formatLink(item, id, state);
        a.id = `navbar_${item}_selector`;
        a.innerText = formatText(item, id);
        return a;
    });

    dropdownMenu.append(...dropdownItems);
    return dropdownMenu;
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
