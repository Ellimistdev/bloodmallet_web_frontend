# bloodmallet.com

> You're seeing the code that runs bloodmallet.com.

Everyone is welcome to add issues, discuss improvements and features, or create
pull requests.

## Data source

- chart data is generated using SimulationCraft with standard profiles from SimulationCraft
- custom charts are generated user input, SimulationCraft, and SimulatioNCraft standard profiles as fallback
- Dragonflight talent tree data (structure, names, spell_id) is kindly provided by raidbots.com

## Development setup

1. Get or have [Python 3.6+](https://www.python.org/downloads/) (make sure to install it into PATH on windows)
2. Get or have [git](https://git-scm.com/downloads) installed
3. Download this repository
    - `$ git clone https://github.com/Bloodmallet/bloodmallet_web_frontend.git bloodmallet` (creates a directory "bloodmallet")
4. Navigate into the created directory
    - `$ cd bloodmallet/`
5. Create a [virtual environment](https://docs.python.org/3/tutorial/venv.html)
    - `$ python3 -m venv env` (creates a directory "env")
    - activate virtual environment
        - `> env/Scripts/activate` (windows)
        - `$ source env/bin/activate` (linux)
6. Install requirements
    - `(env) bloodmallet/$ python -m pip install --upgrade pip setuptools wheel` (update all basic tools)
    - `(env) bloodmallet/$ pip install -U -r requirements_dev.txt` (install requirements)
    - `(env) bloodmallet/$ npm install` (when working with js files)
7. Create local database and tables
    - `(env) bloodmallet/$ python manage.py migrate`
8. Start local django development server
    - `(env) bloodmallet/$ python manage.py runserver`
9. Open `http://127.0.0.1:8000` in your browser of choice. And code away! :tada:

### Optional:

Maybe you want to [create a superuser](https://docs.djangoproject.com/en/dev/intro/tutorial02/#creating-an-admin-user) for local development.
