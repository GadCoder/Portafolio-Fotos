import Image from "next/image";
import ToggleSwitch from "./ToggleSwitch";
export default function TopBar() {
  return (
    <div className="flex mb-6 mt-4 justify-between grid-cols-1 md:grid-cols-2">
      <div className="flex gap-6 items-center">
        <div className="relative w-16 h-16 md:w-24 md:h-24">
          <Image
            src={"/images/profile-picture.jpg"}
            alt="profile-picture"
            className="rounded-full"
            fill={true}
          />
        </div>
        <div className="grid md:grid-rows-2 gap-2 md:gap-4 ">
          <h1 className="font-bold text-md md:text-3xl">Germán Ampuero</h1>
          <h2 className="font-regular text-sm md:text-xl">
            Fotógrafo cuando no estoy programando
          </h2>
        </div>
      </div>
      <ToggleSwitch />
    </div>
  );
}
