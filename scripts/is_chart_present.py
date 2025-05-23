import aiohttp
import asyncio
import dataclasses
import datetime
import json
import itertools
from rich.console import Console
from rich.progress import track
from rich.table import Table

CHART_TYPES = [
    "phials",
    "potions",
    "races",
    "secondary_distributions",
    "talent_target_scaling",
    # "tier_set",
    "trinkets",
    "weapon_enchantments",
]
FIGHT_STYLES = [
    "castingpatchwerk",
    "castingpatchwerk3",
    "castingpatchwerk5",
]

SPECS = [
    ("death_knight", "blood"),
    ("death_knight", "frost"),
    ("death_knight", "unholy"),
    ("demon_hunter", "havoc"),
    ("demon_hunter", "vengeance"),
    ("druid", "balance"),
    ("druid", "feral"),
    ("druid", "guardian"),
    # ("evoker", "augmentation"),
    ("evoker", "devastation"),
    # ("evoker", "preservation"),
    ("hunter", "beast_mastery"),
    ("hunter", "marksmanship"),
    ("hunter", "survival"),
    ("mage", "arcane"),
    ("mage", "fire"),
    ("mage", "frost"),
    ("monk", "brewmaster"),
    ("monk", "windwalker"),
    ("paladin", "protection"),
    ("paladin", "retribution"),
    ("priest", "shadow"),
    ("rogue", "assassination"),
    ("rogue", "outlaw"),
    ("rogue", "subtlety"),
    ("shaman", "elemental"),
    ("shaman", "enhancement"),
    ("warlock", "affliction"),
    ("warlock", "demonology"),
    ("warlock", "destruction"),
    ("warrior", "arms"),
    ("warrior", "fury"),
    ("warrior", "protection"),
]


@dataclasses.dataclass
class ChartData:
    wow_class: str
    wow_spec: str
    simulation_type: str
    fight_style: str

    @property
    def bloodmallet_endpoint(self) -> str:
        # chart/get/<str:simulation_type>/<str:fight_style>/<str:wow_class>/<str:wow_spec>
        return f"https://bloodmallet.com/chart/get/{self.simulation_type}/{self.fight_style}/{self.wow_class}/{self.wow_spec}"


async def does_data_exist_for(chart: ChartData) -> None | ChartData:
    # print(f"start {chart}")
    async with aiohttp.ClientSession() as session:
        async with session.get(chart.bloodmallet_endpoint) as response:

            # print("Status:", response.status)
            # print("Content-type:", response.headers["content-type"])

            try:
                json_data = await response.json()
            except aiohttp.ContentTypeError:
                try:
                    json_data = await response.json(content_type="text/html")
                except json.decoder.JSONDecodeError:
                    json_data = {"status": "broken"}

    # print(f"end {json_data}")
    if response.status == 200 and json_data.get("status", "fine") == "fine":
        return None
    return chart


async def is_data_outdated_for(
    chart: ChartData, age_hours: int = 24 * 4
) -> None | ChartData:
    # print(f"start {chart}")
    async with aiohttp.ClientSession() as session:
        async with session.get(chart.bloodmallet_endpoint) as response:

            # print("Status:", response.status)
            # print("Content-type:", response.headers["content-type"])

            try:
                json_data = await response.json()
            except aiohttp.ContentTypeError:
                try:
                    json_data = await response.json(content_type="text/html")
                except json.decoder.JSONDecodeError:
                    json_data = {"status": "broken"}

    # print(f"end {json_data}")
    # 2023-05-09 16:06:03.473835
    time_format = "%Y-%m-%d %H:%M:%S.%f"
    now = datetime.datetime.utcnow()
    creation_string = json_data.get("metadata", {}).get("timestamp", None)
    if creation_string:
        creation_time = datetime.datetime.strptime(creation_string, time_format)
    else:
        creation_time = datetime.datetime.strptime(
            "2000-01-01 00:00:00.000000", time_format
        )

    if response.status == 200 and (now - creation_time).seconds < age_hours * 60 * 60:
        return None
    return chart


def analyze_charts(charts: list[ChartData], title: str) -> None:
    charts = sorted(
        charts,
        key=lambda chart: f"{chart.wow_class}{chart.wow_spec}{chart.simulation_type}{chart.fight_style}",
    )

    # for broken in broken_charts:
    #     print(f"  {broken}")
    if len(charts) < 1:
        return

    table = Table(title=f"{title}: {len(charts)}")

    table.add_column("Class")
    table.add_column("Spec")
    table.add_column("Simulation Type")
    table.add_column("Fight style")
    # table.add_column("Url")

    for broken_chart in charts:
        table.add_row(
            broken_chart.wow_class,
            broken_chart.wow_spec,
            broken_chart.simulation_type,
            broken_chart.fight_style,
        )

    c = Console()
    c.print(table)


async def main():
    combinations = itertools.product(CHART_TYPES, FIGHT_STYLES, SPECS)

    charts = [
        ChartData(
            wow_class=c[2][0], wow_spec=c[2][1], simulation_type=c[0], fight_style=c[1]
        )
        for c in combinations
    ]

    charts = [chart for chart in charts]
    tasks = [does_data_exist_for(chart) for chart in charts]
    broken_charts: list[ChartData] = []
    for task in track(
        asyncio.as_completed(tasks),
        description="Checking data endpoints for data...",
        total=len(tasks),
    ):
        if missing_chart := await task:
            broken_charts.append(missing_chart)
    analyze_charts(broken_charts, "Broken charts")

    tasks = [is_data_outdated_for(chart) for chart in charts]
    outdated_charts: list[ChartData] = []
    for task in track(
        asyncio.as_completed(tasks),
        description="Checking data endpoints for outdated data...",
        total=len(tasks),
    ):
        if outdated_chart := await task:
            outdated_charts.append(outdated_chart)
    analyze_charts(outdated_charts, "Outdated charts")


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main())
