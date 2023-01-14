NO_D1_WARNING=true
export NO_D1_WARNING

export RED="\033[1;31m"
export GREEN="\033[1;32m"
export YELLOW="\033[1;33m"
export BLUE="\033[1;34m"
export PURPLE="\033[1;35m"
export CYAN="\033[1;36m"
export GREY="\033[0;37m"
export RESET="\033[m"

check_command() {
    if ! command -v "$1" &> /dev/null
    then
        echo "$1 could not be found."
        echo "Exiting."
        exit 1
    fi
}

print_error() {
    echo -e "${RED}$1${RESET}"
}

print_info() {
    echo -e "${CYAN}$1${RESET}"
}
print_success() {
    echo -e "${GREEN}$1${RESET}"
}
