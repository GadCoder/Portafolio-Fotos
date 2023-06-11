"use client";
import { FaSun, FaRegMoon } from "react-icons/fa";
import { useTheme } from "next-themes";
import Switch from "@mui/material/Switch";

export default function ToggleSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center">
      <Switch
        checked={theme === "dark"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      {theme === "dark" ? <FaSun /> : <FaRegMoon />}
    </div>
  );
}
