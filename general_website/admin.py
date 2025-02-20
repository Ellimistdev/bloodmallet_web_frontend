from django.contrib import admin

from general_website.models.simulation import GeneralResult
from general_website.models.world_of_warcraft import Faction
from general_website.models.world_of_warcraft import FightStyle
from general_website.models.simulation import Queue
from general_website.models.world_of_warcraft import Race
from general_website.models.simulation import Result
from general_website.models.simulation import Simulation
from general_website.models.simulation import SimulationType
from general_website.models.world_of_warcraft import Teleporter
from general_website.models.account import User
from general_website.models.world_of_warcraft import WowClass
from general_website.models.world_of_warcraft import WowSpec
from general_website.models.dynamic_config import Broadcast
from general_website.models.dynamic_config import Config

# from django.contrib.auth.admin import UserAdmin

# admin.site.register(User, UserAdmin)


# Register your models here.
@admin.register(Broadcast)
class BroadcastAdmin(admin.ModelAdmin):
    pass


@admin.register(Config)
class ConfigAdmin(admin.ModelAdmin):
    pass


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_filter = (
        "is_staff",
        "is_guide_writer",
        "is_simulationcraft_developer",
        "patron_tier",
    )
    search_fields = [
        "username",
        "email",
        "patron_name",
    ]


@admin.register(Faction)
class FactionAdmin(admin.ModelAdmin):
    pass


@admin.register(Teleporter)
class TeleporterAdmin(admin.ModelAdmin):
    pass


@admin.register(Race)
class RaceAdmin(admin.ModelAdmin):
    pass


@admin.register(WowClass)
class WowClassAdmin(admin.ModelAdmin):
    pass


@admin.register(WowSpec)
class WowSpecAdmin(admin.ModelAdmin):
    pass


@admin.register(FightStyle)
class FightStyleAdmin(admin.ModelAdmin):
    pass


@admin.register(SimulationType)
class SimulationTypeAdmin(admin.ModelAdmin):
    pass


@admin.register(Simulation)
class SimulationAdmin(admin.ModelAdmin):
    list_filter = ("failed",)
    search_fields = [
        "user__username",
        "user__email",
        "id",
    ]
    readonly_fields = ("created_at",)


@admin.register(Queue)
class QueueAdmin(admin.ModelAdmin):
    list_filter = ("state",)


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    search_fields = [
        "simulation__user__username",
        "simulation__user_email",
        "simulation__id",
    ]


@admin.register(GeneralResult)
class GeneralResultAdmin(admin.ModelAdmin):
    list_filter = ("wow_class", "wow_spec")

    search_fields = [
        "simulation__user__username",
        "simulation__user_email",
        "simulation__id",
        "wow_class",
        "wow_spec",
    ]
