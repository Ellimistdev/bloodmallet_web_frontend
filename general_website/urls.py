from django.urls import path, include
from django.contrib.auth.views import (
    PasswordResetView,
    PasswordResetDoneView,
    PasswordResetCompleteView,
    PasswordResetConfirmView,
)
from . import views
from .views import talent_trees

from allauth.socialaccount.views import ConnectionsView

urlpatterns = [
    # general
    path("", views.index, name="index_empty"),
    path("index.html", views.index, name="index_long"),
    path("index", views.index, name="index"),
    path("about", views.about, name="about"),
    # path('privacy_policy', views.privacy_policy, name='privacy_policy'),
    path(
        "terms_and_conditions",
        views.terms_and_conditions,
        name="terms_and_conditions",
    ),
    path("faq", views.faq, name="faq"),
    path("handbook", views.handbook, name="handbook"),
    path("tears", views.r_tears, name="r_tears"),
    path("tlist", views.tears, name="tears"),
    path("error", views.error, name="error"),
    # charts
    path("my_charts", views.my_charts, name="my_charts"),
    path("chart/", views.chart, name="chart_ph"),
    path("chart_debug", views.chart_debug, name="chart_debug"),
    path(
        "chart/windfury_totem", views.chart_windfury_totem, name="chart_windfury_totem"
    ),
    path(
        "chart/power_infusion", views.chart_power_infusion, name="chart_power_infusion"
    ),
    # Trinket Get
    path(
        "chart/get/trinkets/<str:item_name>/<str:item_level>/<str:fight_style>",
        views.get_trinket_data,
        name="get_trinket_data",
    ),
    path(
        "chart/get/trinkets/<str:item_name>/<str:fight_style>",
        views.get_trinket_data,
        name="get_trinket_data",
    ),
    path(
        "chart/get/trinkets/<str:item_name>",
        views.get_trinket_data,
        name="get_trinket_data",
    ),
    # Trinket Chart
    path(
        "chart/trinkets/<str:item_name>/<str:item_level>/<str:fight_style>",
        views.chart_trinket,
        name="chart_trinket",
    ),
    path(
        "chart/trinkets/<str:item_name>/<str:fight_style>",
        views.chart_trinket,
        name="chart_trinket",
    ),
    path("chart/trinkets/<str:item_name>", views.chart_trinket, name="chart_trinket"),
    path("chart/trinkets", views.chart_trinket, name="chart_trinket"),
    path("chart/<uuid:chart_id>", views.chart, name="chart"),
    path(
        "chart/<str:wow_class>/<str:wow_spec>/<str:simulation_type>/<str:fight_style>",
        views.standard_chart,
        name="standard_chart",
    ),
    path("chart/create", views.create_chart, name="create_chart"),
    path("chart/delete", views.delete_chart, name="delete_chart"),
    path("chart/get/<uuid:chart_id>", views.get_chart_data, name="get_chart_data"),
    path(
        "chart/get/<str:simulation_type>/<str:fight_style>/<str:wow_class>/<str:wow_spec>",
        views.get_chart_data,
        name="get_standard_chart_data",
    ),
    path("chart/state/", views.get_chart_state, name="get_chart_state_ph"),
    path("chart/state/<uuid:chart_id>", views.get_chart_state, name="get_chart_state"),
    # portals o_O but blizzard killed most...needs heavy data updates
    # path('portals', views.portals, name='portals'),
    # settings
    path("settings/general", views.settings, name="settings"),
    path("settings/profile", views.profile, name="profile"),
    path("settings/change_password", views.change_password, name="change_password"),
    path("settings/delete_profile", views.delete_profile, name="delete_profile"),
    # allauth account actions
    path("accounts/", include("allauth.urls")),
    path("settings/connections", ConnectionsView.as_view(), name="account_connections"),
    # account actions
    path("login", views.login, name="login"),
    path("logout", views.logout, name="logout"),
    path("signup", views.signup, name="signup"),
    path(
        "password_reset",
        PasswordResetView.as_view(
            template_name="general_website/password_reset.html",
            email_template_name="general_website/password_reset_mail.html",
        ),
        name="password_reset",
    ),
    path(
        "password_reset/done",
        PasswordResetDoneView.as_view(
            template_name="general_website/password_reset_done.html"
        ),
        name="password_reset_done",
    ),
    path(
        "reset/<uidb64>/<token>",
        PasswordResetConfirmView.as_view(
            template_name="general_website/password_reset_confirm.html",
        ),
        name="password_reset_confirm",
    ),
    path(
        "reset/done",
        PasswordResetCompleteView.as_view(
            template_name="general_website/password_reset_complete.html",
        ),
        name="password_reset_complete",
    ),
    # languages
    path("i18n/", include("django.conf.urls.i18n")),
    path("logo_comparison", views.logo_comparison, name="logo_comparison"),
    # dragonflight pre-stuff
    path(
        "dragonflight/talent_trees",
        talent_trees.talent_trees,
        name="talent_trees",
    ),
    path("empty", views.empty, name="empty"),
    path("bm_tooltips", views.bm_tooltips, name="bm_tooltips"),
    path("bm_charts", views.bm_charts, name="bm_charts"),
]
