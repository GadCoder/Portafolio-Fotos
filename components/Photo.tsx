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
  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    objectFit: "cover",
  };
  return (
    <img
      src={src}
      width={0}
      height={0}
      sizes="100vw"
      style={imageStyle}
      alt={name}
      className="mb-6 rounded"
    />
  );
}
