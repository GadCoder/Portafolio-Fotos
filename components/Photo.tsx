import Image from "next/image";

export default function Photo({
  isHorizontal = true,
}: {
  isHorizontal?: boolean;
}) {
  return (
    <div className="mb-4">
      <Image
        src={`/images/obi-${isHorizontal ? "horizontal" : "vertical"}.jpg`}
        width={0}
        height={0}
        sizes="100vw"
        style={{ width: "100%", height: "auto" }} // optional
        alt="Obi Wan el mejor"
      />
    </div>
  );
}
