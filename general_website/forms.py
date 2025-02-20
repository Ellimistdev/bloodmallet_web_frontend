# -*- coding: utf-8 -*-

import logging


from django import forms
from django.contrib.auth.forms import (
    UserCreationForm,
    AuthenticationForm,
    PasswordChangeForm,
)
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from general_website.models.account import User
from general_website.models.simulation import Simulation
from general_website.models.world_of_warcraft import SimulationType
from general_website.models.world_of_warcraft import WowSpec

from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Field, Div, HTML
from crispy_forms.bootstrap import Accordion, AccordionGroup, StrictButton
from crispy_bootstrap5.bootstrap5 import BS5Accordion

logger = logging.getLogger(__name__)


class SignUpForm(UserCreationForm):
    email = forms.EmailField(
        max_length=254, help_text="Required. 254 characters or fewer."
    )

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password1",
            "password2",
        )


class UserLoginForm(AuthenticationForm):
    pass


class UserPasswordUpdateForm(PasswordChangeForm):
    """Settings form for the user to update his own profile."""

    pass


class ProfileDeleteForm(forms.Form):
    user_id = forms.CharField(max_length=36, widget=forms.HiddenInput())


class SimulationCreationForm(forms.ModelForm):
    dynamic_delete = forms.BooleanField(
        required=False,
        label=_("Auto-remove oldest chart"),
        help_text=_(
            "If your slots are filled, enabling this checkbox will auto-remove the oldest chart to free up a slot."
        ),
        initial=True,
    )
    time_choices = (
        ("", "---------"),
        (45, _("45 seconds")),
        (60, _("1 minute")),
        (90, _("1 minute and 30 seconds")),
        (120, _("2 minutes")),
        (180, _("3 minutes")),
        (300, _("5 minutes")),
        (420, _("7 minutes")),
        (600, _("10 minutes")),
    )
    fight_length = forms.ChoiceField(
        choices=time_choices, required=False, help_text=_(""), label=_("Fight Length")
    )

    boss = _("Boss")
    bosses = _("Bosses")
    target_choices = (
        ("", "---------"),
        (1, f"1 {boss}"),
        (2, f"2 {bosses}"),
        (3, f"3 {bosses}"),
        (4, f"4 {bosses}"),
        (5, f"5 {bosses}"),
        (6, f"6 {bosses}"),
        (7, f"7 {bosses}"),
        (8, f"8 {bosses}"),
        (9, f"9 {bosses}"),
        (10, f"10 {bosses}"),
    )
    targets = forms.ChoiceField(
        choices=target_choices, required=False, label=_("Boss count")
    )

    class Meta:
        model = Simulation
        fields = (
            "name",
            "wow_spec",
            "simulation_type",
            "fight_style",
            "custom_profile",
            "custom_fight_style",
            "custom_apl",
        )

    def __init__(self, *args, **kwargs):
        super(SimulationCreationForm, self).__init__(*args, **kwargs)

        self.illegal_input = [
            "html",
            "log",
            "output",
            "debug",
            "calculate_scale_factors",
            "scale_only",
            "chart_show_relative_difference",
            "maximize_reporting",
            "dps_plot_stat",
            "reforge_plot_amount",
            "reforge_plot_step",
            "reforge_plot_output_file",
            "profileset_work_threads",
            "threads",
            "target_error",
            "iterations",
        ]

        advanced = _("Advanced")

        self.fields["simulation_type"].queryset = SimulationType.objects.filter(
            is_deleted=False
        ).order_by("name")
        self.fields["wow_spec"].queryset = WowSpec.objects.order_by(
            "wow_class__tokenized_name", "tokenized_name"
        )

        self.helper = FormHelper()
        self.helper.layout = Layout(
            Div(
                Div(Field("name"), css_class="col-12 col-md-6"),
                Div(Field("wow_spec"), css_class="col-12 col-md-6"),
                css_class="row",
            ),
            Div(
                Div(Field("simulation_type"), css_class="col-12 col-md-6"),
                Div(Field("fight_style"), css_class="col-12 col-md-6"),
                css_class="row",
            ),
            Div(
                Div(
                    Field(
                        "custom_profile",
                        placeholder=_("Paste your /simc output into this element."),
                    ),
                    css_class="col-12",
                ),
                css_class="row",
            ),
            Div(Div(Field("dynamic_delete"), css_class="col-12"), css_class="row"),
            StrictButton(
                _("Create Chart"),
                type="submit",
                css_class="btn btn-primary",
            ),
            Div(HTML(f"<h2>{advanced}</h2>"), css_class="mt-3"),
            Div(
                BS5Accordion(
                    AccordionGroup(
                        _("Fight style"),
                        Div(
                            Div(Field("fight_length"), css_class="col-6 col-md-4"),
                            Div(Field("targets"), css_class="col-6 col-md-4"),
                            Div(Field("custom_fight_style"), css_class="col-12"),
                            css_class="form-row",
                        ),
                        active=False,
                    ),
                    AccordionGroup(
                        _("APL"),
                        Field("custom_apl"),
                        active=False,
                    ),
                ),
                css_class="mb-3",
            ),
            StrictButton(
                _("Create Chart"),
                type="submit",
                css_class="btn btn-primary",
            ),
        )

    def clean_custom_profile(self):
        data = self.cleaned_data["custom_profile"]

        if any(
            [
                group in self.illegal_input
                for line in data.splitlines()
                for group in line.split()
            ]
        ):
            raise ValidationError(
                _("An illegal input was detected."), code="illegal input"
            )

        MAX_LENGTH = 10000
        if len(data) > MAX_LENGTH:
            error_message = _(
                "Custom profile input was too long. Input can have a max-length of %(MAX_LENGTH)s characters."
            ) % {"MAX_LENGTH": MAX_LENGTH}
            raise ValidationError(
                error_message,
                code="long input",
            )

        return data[:MAX_LENGTH]

    def clean_custom_fight_style(self):
        data = self.cleaned_data["custom_fight_style"]

        if any(
            [
                group in self.illegal_input
                for line in data.splitlines()
                for group in line.split()
            ]
        ):
            raise ValidationError(
                _("An illegal input was detected."), code="illegal input"
            )

        MAX_LENGTH = 2048
        if len(data) > MAX_LENGTH:
            error_message = _(
                "Fight style input was too long. Input can have a max-length of %(MAX_LENGTH)s characters."
            ) % {"MAX_LENGTH": MAX_LENGTH}
            raise ValidationError(
                error_message,
                code="long input",
            )

        return data[:MAX_LENGTH]

    def clean_custom_apl(self):
        data = self.cleaned_data["custom_apl"]

        if any(
            [
                group in self.illegal_input
                for line in data.splitlines()
                for group in line.split()
            ]
        ):
            raise ValidationError(
                _("An illegal input was detected."), code="illegal input"
            )

        MAX_LENGTH = 65536
        if len(data) > MAX_LENGTH:
            error_message = _(
                "APL input was too long. Input can have a max-length of %(MAX_LENGTH)s characters."
            ) % {"MAX_LENGTH": MAX_LENGTH}
            raise ValidationError(
                error_message,
                code="long input",
            )

        return data[:MAX_LENGTH]
