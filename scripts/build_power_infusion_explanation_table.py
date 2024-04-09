import dataclasses
import datetime
import os
import subprocess
import typing

try:
    from simc_support.game_data.WowSpec import WOWSPECS, WowSpec
except ImportError:
    exit("Helper script requires the library 'simc_support'.")


PATH_SIMC = "D:/repositories/simc"
T_NUMBER = 31
TIER = f"Tier{T_NUMBER}"
T = f"T{T_NUMBER}"
GENERATED_START = "<!-- auto generated power infusion section start -->"
GENERATED_END = "<!-- auto generated power infusion section end -->"
TARGET_FILE = "D:/repositories/website/general_website/templates/general_website/chart_information/simulation_type/power_infusion.html"


def get_simc_hash() -> str:
    cmd = ["git", "rev-parse", "HEAD"]
    process = subprocess.run(
        cmd, universal_newlines=True, capture_output=True, cwd=PATH_SIMC
    )
    return process.stdout.strip()


def _underscored_simc_name(wow_spec: WowSpec) -> str:
    return f"{wow_spec.wow_class.full_name.replace(' ', '_')}_{wow_spec.full_name.replace(' ', '_')}"


@dataclasses.dataclass(frozen=True)
class PISpecInformation:
    wow_spec: WowSpec
    lines: typing.List[typing.Tuple[int, str]]
    """List of line number and line tuples.
    """
    comments: typing.List[typing.Tuple[int, typing.Optional[str]]]
    """List of line number and comment tuples.
    """

    @property
    def has_power_infusion(self) -> bool:
        return bool(self.lines)

    @property
    def has_explanation(self) -> bool:
        return any(c for _, c in self.comments)

    @property
    def get_comment_code(
        self,
    ) -> typing.Iterable[typing.Tuple[typing.Optional[str], str]]:
        return zip([c for _, c in self.comments], [c for _, c in self.lines])

    @staticmethod
    def create_from(wow_spec: WowSpec) -> "PISpecInformation":
        # D:\repositories\simc\profiles\Tier29\T29_Shaman_Elemental.simc
        profile_path = os.path.join(
            PATH_SIMC,
            "profiles",
            TIER,
            f"{T}_{_underscored_simc_name(wow_spec)}.simc",
        )

        lines: typing.List[typing.Tuple[int, str]] = []
        comments: typing.List[typing.Tuple[int, typing.Optional[str]]] = []
        with open(profile_path, "r") as f:
            previous_comment = ""
            previous_comment_line_number = -1
            for i, line in enumerate(f.readlines()):
                if (
                    "invoke_external_buff,name=power_infusion" in line
                    and not line.startswith("#")
                ):
                    lines.append((i, line.strip()))
                    if previous_comment and previous_comment_line_number == i - 1:
                        comments.append(
                            (previous_comment_line_number, previous_comment)
                        )
                    else:
                        comments.append((-1, None))
                if line.startswith("#"):
                    previous_comment = line.strip().strip("# ")
                    previous_comment_line_number = i
        return PISpecInformation(wow_spec, lines, comments)


def generate_table(
    spec_infos: typing.List[PISpecInformation], simc_hash: str
) -> typing.List[str]:
    spacing = " " * 4

    table = []
    table.append('<table class="table">')
    # header
    table.append(spacing + "<thead>")
    table.append(2 * spacing + "<tr>")
    table.append(3 * spacing + '<th scope="col">Spec</th>')
    table.append(3 * spacing + '<th scope="col">Explanation</th>')
    table.append(3 * spacing + '<th scope="col">Last explanation update</th>')
    table.append(2 * spacing + "</tr>")
    table.append(spacing + "</thead>")

    table.append(spacing + "<tbody>")
    for spec in spec_infos:
        if spec.has_explanation:
            explanation = ""
            for comment, code in spec.get_comment_code:
                prefix = ""
                # if code.startswith("actions."):
                #     prefix = code.split("actions.")[1].split("+=")[0].strip("+")
                #     prefix += ": "
                if comment:
                    explanation += " " + prefix + comment
                    explanation.strip()
        elif spec.has_power_infusion:
            explanation = "APL support exists but an explanation text is missing."
        else:
            explanation = "No APL support."
        today = datetime.date.today()

        table.append(2 * spacing + "<tr>")
        table.append(
            3 * spacing
            + f'<th scope="row"><a href="https://github.com/simulationcraft/simc/blob/dragonflight/profiles/{TIER}/{T}_{_underscored_simc_name(spec.wow_spec)}.simc">{spec.wow_spec}</a></th>'
        )
        table.append(3 * spacing + f"<td>{explanation}</td>")
        table.append(
            3 * spacing
            + f'<td>{today} <a href="https://github.com/simulationcraft/simc/commit/{simc_hash}">#{simc_hash[:8]}</a></td>'
        )
        table.append(2 * spacing + "</tr>")

    table.append(spacing + "</tbody>")
    table.append("</table>")
    return table


def update_target_file(table: typing.List[str], target_file: str) -> None:
    with open(target_file, "r") as f:
        original_lines = f.readlines()

    # remove managed section
    is_managed_section = False
    new_file_lines = []
    for line in original_lines:
        if GENERATED_END in line:
            is_managed_section = False

            new_file_lines += [r + "\n" for r in table]

        if is_managed_section:
            continue

        new_file_lines.append(line)

        if GENERATED_START in line:
            is_managed_section = True

    with open(target_file, "w") as f:
        f.writelines(new_file_lines)


def main():
    # collect data from profiles
    simc_hash = get_simc_hash()
    pi_spec_information: typing.List[PISpecInformation] = []
    for spec in WOWSPECS:
        try:
            pi_spec_information.append(
                PISpecInformation.create_from(
                    spec,
                )
            )
        except FileNotFoundError:
            print(f"Profile for {spec} not found. Skipping")
            continue

    # build table
    # save table to file
    # for info in pi_spec_information:
    # if info.has_explanation:
    #     print(info.wow_spec, info.comments)
    # if info.has_power_infusion and not info.has_explanation:
    #     print(info.wow_spec, info.lines)

    table = generate_table(pi_spec_information, simc_hash)

    update_target_file(table, TARGET_FILE)


if __name__ == "__main__":
    main()
