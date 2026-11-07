#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    krnl_launcher_lib::run()
}
