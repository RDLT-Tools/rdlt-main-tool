import App from "./App.mjs";
import SVGAssetsRepository from "./render/builders/SVGAssetsRepository.mjs";

async function start() {
    await SVGAssetsRepository.initialize();
    await App.initialize();
    console.log("App is ready.");
}

start();
