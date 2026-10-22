import { packager } from "@electron/packager";
import { mkdir, copyFile, writeFile, rm, cp, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = process.cwd();
const { version } = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const stage = path.join(root, ".portable-stage");
await rm(stage, { recursive: true, force: true });
await mkdir(path.join(stage, "dist"), { recursive: true });
await cp(path.join(root, "dist"), path.join(stage, "dist"), {
  recursive: true,
});
await copyFile("electron.cjs", path.join(stage, "electron.cjs"));
await writeFile(
  path.join(stage, "package.json"),
  JSON.stringify({
    name: "godoy-paint-car",
    version,
    main: "electron.cjs",
    description: "Godoy Paint Car — editor local de texturas 3D",
    author: "Godoy Paint Car",
    private: true,
  }),
);
const paths = await packager({
  dir: stage,
  name: "Godoy Paint Car",
  executableName: "GodoyPaintCar",
  platform: "win32",
  arch: "x64",
  electronVersion: "45.0.0",
  out: path.join(root, "release"),
  overwrite: true,
  asar: true,
  prune: true,
  download: { cacheRoot: "/tmp/paintfive-electron-cache" },
  win32metadata: {
    CompanyName: "Godoy Paint Car",
    FileDescription: "Godoy Paint Car",
    ProductName: "Godoy Paint Car",
  },
});
for (const directory of paths) {
  await copyFile("README.md", path.join(directory, "README.md"));
  await copyFile("CHANGELOG.md", path.join(directory, "CHANGELOG.md"));
  await copyFile(
    "THIRD_PARTY_NOTICES.txt",
    path.join(directory, "THIRD_PARTY_NOTICES.txt"),
  );
  await writeFile(
    path.join(directory, "LEIA-ME.txt"),
    [
      `GODOY PAINT CAR ${version} - WINDOWS x64 PORTABLE`,
      "",
      "Extraia TODO o ZIP para uma pasta e abra GodoyPaintCar.exe.",
      "Nao execute o aplicativo diretamente dentro do ZIP.",
      "Nao e necessario instalar Node.js ou npm.",
      "Windows 10/11 64 bits. Requer suporte a WebGL.",
      "",
      "Salve seus projetos em uma pasta escolhida por voce; nao ha salvamento automatico.",
      "Abre YFT/YDD/YTD GTA V Legacy/FiveM diretamente.",
      "Exporte uma copia do YTD editado em DXT1/DXT3/DXT5 ou BGRA/RGBA.",
      "Recursos protegidos, Enhanced/Gen9 e texturas BC7 nao sao suportados.",
      "Leia README.md para detalhes e limitacoes.",
      "Aplicativo nao assinado digitalmente.",
      "",
    ].join("\r\n"),
  );
  const archive = path.join(
    root,
    "release",
    `Godoy-Paint-Car-${version}-Windows-x64-Portable.zip`,
  );
  await rm(archive, { force: true });
  execFileSync("zip", ["-q", "-r", archive, path.basename(directory)], {
    cwd: path.dirname(directory),
  });
  console.log(archive);
}
await rm(stage, { recursive: true, force: true });
