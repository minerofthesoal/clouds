// Volumetric Clouds Extension for MakeCode Arcade

namespace perlin {
    let perm: number[] = []

    export function init(seed: number = 1337): void {
        perm = []
        let base = []
        for (let i = 0; i < 256; i++) base.push(i)

        Math.seedrandom(seed.toString())
        while (base.length > 0) {
            let index = Math.randomRange(0, base.length - 1)
            perm.push(base[index])
            base.removeAt(index)
        }

        perm = perm.concat(perm)
    }

    export function noise(x: number, y: number): number {
        let xi = Math.floor(x) & 255
        let yi = Math.floor(y) & 255
        let xf = x - Math.floor(x)
        let yf = y - Math.floor(y)

        let u = fade(xf)
        let v = fade(yf)

        let aa = perm[perm[xi] + yi]
        let ab = perm[perm[xi] + yi + 1]
        let ba = perm[perm[xi + 1] + yi]
        let bb = perm[perm[xi + 1] + yi + 1]

        let x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
        let x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
        return (lerp(x1, x2, v) + 1) / 2
    }

    function fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10)
    }

    function lerp(a: number, b: number, t: number): number {
        return a + t * (b - a)
    }

    function grad(hash: number, x: number, y: number): number {
        switch (hash & 3) {
            case 0: return x + y
            case 1: return -x + y
            case 2: return x - y
            case 3: return -x - y
            default: return 0
        }
    }
}

namespace clouds {
    enum WeatherType { Clear, Cloudy, Stormy }

    let cloudSprites: Sprite[] = []
    let backgroundClouds: Sprite[] = []
    let isDay = true
    let transition = 0
    let transitionSpeed = 0.01
    let weather: WeatherType = WeatherType.Clear
    let cycleDuration = 0
    let transitionDir = 1

    //% block
    export function createVolumetricClouds(count: number = 8, layers: number = 2): void {
        perlin.init()
        for (let i = 0; i < count; i++) {
            const depth = i % layers
            const s = sprites.create(generateCloudImage(depth), SpriteKind.create())
            s.x = Math.randomRange(0, scene.screenWidth())
            s.y = Math.randomRange(10 + depth * 10, 40 + depth * 10)
            s.z = depth
            s.vx = -((depth + 1) * 5) / 10
            if (depth == 0) backgroundClouds.push(s)
            else cloudSprites.push(s)
        }

        game.onUpdate(() => {
            updateTransition()
            for (let cloud of cloudSprites.concat(backgroundClouds)) {
                cloud.x += cloud.vx
                if (weather == WeatherType.Stormy) cloud.x += -1

                if (cloud.x < -32) {
                    cloud.x = scene.screenWidth() + 32
                    cloud.y = Math.randomRange(10, 50)
                    cloud.setImage(generateCloudImage(cloud.z))
                }
            }

            if (weather == WeatherType.Stormy && Math.percentChance(0.5)) {
                screen.setBrightness(255)
                pause(30)
                screen.setBrightness(isDay ? 100 : 40)
            }
        })
    }

    //% block
    export function setDaytime(value: boolean): void {
        isDay = value
        transition = isDay ? 0 : 1
        updateCloudImages()
    }

    //% block
    export function toggleDayNightCycle(duration: number): void {
        cycleDuration = duration
        game.onUpdateInterval(cycleDuration, () => {
            transitionDir *= -1
        })
    }

    //% block
    export function setWeather(type: string): void {
        switch (type.toLowerCase()) {
            case "clear": weather = WeatherType.Clear; break
            case "cloudy": weather = WeatherType.Cloudy; break
            case "stormy": weather = WeatherType.Stormy; break
        }
        updateCloudImages()
    }

    function updateTransition() {
        if (cycleDuration > 0) {
            transition += transitionSpeed * transitionDir
            transition = Math.clamp(0, 1, transition)
            screen.setBrightness(Math.map(transition, 0, 1, 100, 40))
            updateCloudImages()
        }
    }

    function updateCloudImages() {
        for (let cloud of cloudSprites.concat(backgroundClouds)) {
            cloud.setImage(generateCloudImage(cloud.z))
        }
    }

    function generateCloudImage(layer: number): Image {
        const width = 32
        const height = 16
        let img = image.create(width, height)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let n = perlin.noise(x * 0.1 + layer * 10, y * 0.1 + layer * 20)
                let alpha = Math.floor(n * 4)
                if (alpha > 0) {
                    let dayColor = alpha + 1
                    let nightColor = 14 - alpha
                    let color = Math.round(dayColor * (1 - transition) + nightColor * transition)
                    if (weather == WeatherType.Stormy) color = Math.max(1, color - 2)
                    img.setPixel(x, y, color)
                }
            }
        }
        return img
    }
}
