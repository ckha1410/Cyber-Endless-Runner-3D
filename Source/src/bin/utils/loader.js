import * as THREE from "three";
import EventEmitter from "./event-emitter";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

export default class Loader extends EventEmitter{
    constructor(props, options = {}) {
        super(props);

        this.loader = new GLTFLoader()
        this.textureLoader = new THREE.TextureLoader();
        if (options.path) this.loader.setPath(options.path);

        this.items = {};

        if (!!props) {
            this.load(props);
        }
    }

    load(resources) {
        resources.forEach(resource => {
            this.loader.load(resource.source, scene => {
                this.items[resource.name] = scene;

                this.emit('loaded', {resource, scene});
            })
        })
    }
}
