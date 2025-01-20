import Image from "next/image";
import ToggleSwitch from "./ToggleSwitch";
export default function TopBar() {
  return (
    <div className="flex mb-6 mt-6 justify-center grid-cols-1 md:grid-cols-2">
      <div className="flex gap-6 items-center">
        <div className="grid md:grid-rows-2 gap-2 md:gap-4 ">
          <h1 className="font-bold text-md md:text-3xl">Germán Ampuero</h1>
          <h2 className="font-regular text-sm md:text-xl text-center">
            A veces tomo fotos
          </h2>
        </div>
      </div>
    </div>
  );
}
