import Image from "next/image";

export default function Photo({
  isHorizontal = true,
}: {
  isHorizontal?: boolean;
}) {
  return (
    <Image
      src={`/images/obi-${isHorizontal ? "horizontal" : "vertical"}.jpg`}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width: "100%", height: "auto" }} // optional
      alt="Obi Wan el mejor"
      className="mb-4 rounded"
    />
  );
}
