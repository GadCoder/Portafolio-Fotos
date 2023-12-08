import Image from "next/image";

export default function Photo({
  isHorizontal,
  src,
  name,
}: {
  isHorizontal?: boolean;
  src: string;
  name: string;
}) {
  return (
    <Image
      src={src}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width: "100%", height: "auto" }}
      alt={name}
      className="mb-6 rounded"
    />
  );
}
