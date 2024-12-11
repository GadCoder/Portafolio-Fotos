"use client";
import { FaSun, FaRegMoon } from "react-icons/fa";
import { useTheme } from "next-themes";
import Switch from "@mui/material/Switch";

export default function ToggleSwitch() {
  const { theme, setTheme } = useTheme();
  const changeTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex items-center">
      <Switch defaultChecked onClick={() => changeTheme()} />
      {theme === "dark" ? <FaSun /> : <FaRegMoon />}
    </div>
  );
}
