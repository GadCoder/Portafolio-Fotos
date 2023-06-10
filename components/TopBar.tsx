import Image from "next/image";
import ToggleSwitch from "./ToggleSwitch";
export default function TopBar() {
  return (
    <div className="flex mb-8 justify-between grid-cols-1 md:grid-cols-2">
      <div className="flex gap-6 items-center">
        <Image
          src={"/images/profile-picture.jpg"}
          alt="profile-picture"
          width={96}
          height={96}
          className="rounded-full"
        />
        <div className="grid grid-rows-2  gap-1 md:gap-3">
          <h1 className="font-bold text-lg md:text-3xl">Germán Ampuero</h1>
          <h2 className="font-medium md:text-xl" style={{}}>
            Fotógrafo aficionado
          </h2>
        </div>
      </div>
      <ToggleSwitch />
    </div>
  );
}
