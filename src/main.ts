import './style.css'

const captrue = document.querySelector<HTMLButtonElement>('#capture')!

class TargetColor extends HTMLElement {
  targetHue: number;

  constructor() {
    super()
    this.targetHue = this.generateRandomHue()
  }

  connectedCallback() {
    this.style.backgroundColor = `hsl(${this.targetHue} 100% 50%)`;
  }

  generateRandomHue() {
    return Math.round(Math.random() * 360)
  }
}

customElements.define('target-color', TargetColor)


class UserVideo extends HTMLElement {
  video: HTMLVideoElement

  constructor() {
    super()

    this.video = document.createElement('video')
    this.appendChild(this.video)
  }

  connectedCallback() {
    this.startWebcam().catch((err) => console.error('Could not access webcam', err))
  }

  async startWebcam() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    this.video.srcObject = stream
    this.video.autoplay = true
    this.video.playsInline = true
  }

  private rgbToHue(r: number, g: number, b: number) {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    if (delta === 0) return 0

    let hue: number
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4

    hue *= 60
    return hue < 0 ? hue + 360 : hue
  }

  private getAverageHue() {
    const canvas = document.createElement('canvas')
    canvas.width = this.video.videoWidth
    canvas.height = this.video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(this.video, 0, 0)

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let total = 0
    let count = 0
    // sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      total += this.rgbToHue(data[i], data[i + 1], data[i + 2])
      count++
    }

    return total / count
  }

  checkColor(targetHue: number) {
    const avgHue = this.getAverageHue()
    const diff = Math.abs(avgHue - targetHue)
    const circularDiff = Math.min(diff, 360 - diff)
    const tolerance = targetHue * 0.2



    alert(circularDiff <= tolerance ? 'you win' : 'you lose')
  }
}

customElements.define('user-video', UserVideo)

const userVideo = document.querySelector<UserVideo>('user-video')!
const target = document.querySelector<TargetColor>('target-color')!

captrue.addEventListener('click', () => {
  userVideo.checkColor(target.targetHue)
})
