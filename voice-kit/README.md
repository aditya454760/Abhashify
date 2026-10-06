# Voice kit: give Adi and Anu a voice you choose

This folder has what you need to give the assistant a voice of your choice, online and offline. It is meant for voices of people who have said yes, such as friends who agreed, or your own.

## What you can do

| | Online | Offline |
|---|---|---|
| How | A cloned voice from ElevenLabs, made from a recording | A voice trained from recordings, running inside the app |
| What it needs | Internet, an ElevenLabs key and a paid plan | Nothing after it is added |
| Hindi and English | Both (the cloned voice speaks both) | One voice file per language |
| Where it is set up | Assistant settings → Custom voice | Assistant settings → Offline voice pack |

The app tries them in this order for every sentence: a saved clip of the cloned voice, then the cloned voice itself (online), then the offline voice pack, then the phone's own voice. If one fails, the next one takes over, so the assistant never goes silent.

Sentences spoken in the cloned voice are saved on the device, so those exact sentences play offline too.

## Before anything: permission

- Record only people who clearly agreed, and who understand the voice may be added to the app and used by anyone who has it.
- The recorder page makes the speaker read a consent statement aloud, and saves it next to the recordings (`consent/` in the zip). Keep it with the audio. The training notebook refuses to run without it.
- If you put a trained voice into the public `docs/` folder or the GitHub repository, anyone can download it. If you want only yourself and your friends to have it, keep the two files private and add them on each device from the settings screen.
- If a speaker later asks for their voice to be removed, delete it (Settings → Remove) and delete the files.

## The offline voice, step by step

You do this once per language and per assistant voice. English Anu, Hindi Anu, English Adi and Hindi Adi are four voices.

1. **Record.** Open `recorder.html` (`https://aditya454760.github.io/Abhyashify/voice-kit/recorder.html`) on a phone, in a quiet room. Pick the language and whether the voice is for Anu or Adi, enter the speaker's name, tick the agreement, and read what appears on the screen. There are about 250 sentences (around 15 minutes of speech). It can be done in several sittings; takes are kept on the phone. It also checks each take for being too quiet, too loud or too short. At the end press **Download my recordings**. Nothing is uploaded anywhere.
2. **Train.** Open `train/train_piper.ipynb` in Google Colab (free GPU is enough). Run the cells in order, upload the zip when asked, and wait. It fine-tunes a ready-made Piper voice, then exports `<name>.onnx` and `<name>.onnx.json`. Expect from one to a few hours. It listens back with three test sentences before you download.
3. **Add.** In the app: assistant settings → Offline voice pack → tick the permission box → choose both files → *Add the English/Hindi voice*. The app checks the model in a worker before saving it.

## The online voice, step by step

1. Make an ElevenLabs account on a plan that allows instant voice cloning, and copy your API key.
2. In the app: assistant settings → Custom voice → paste the key, tick that the person agreed, type their name, choose 1 to 5 recordings (1 to 3 minutes of clear speech in total; the recorder page can make them, or use any clean recordings) and press **Create the voice**.
3. Press **Save common phrases for offline** while you have internet. About 18 short phrases are saved on the device.

## What I could and could not check

- Checked, with a real browser: the recorder and its zip file, the offline engine (text to phonemes to the model to audio, in English and Hindi), keeping working after going offline and reloading, and the online voice logic against a stand-in for ElevenLabs.
- Not checked: how a real trained voice sounds, anything on a real phone, and the training notebook (it needs a GPU). The ElevenLabs calls follow their documented API but were not run against the real service.
- Hindi text-to-speech depends on eSpeak NG's Hindi rules. Numbers and English words inside Hindi sentences may be read oddly. The app strips eSpeak's language markers, but a Hindi voice is best at Hindi text.

## Files

- `make_sentences.py`: writes the sentence lists in `docs/voice-kit/` (Anu and Adi forms in English and Hindi).
- `../docs/voice-kit/recorder.html`: the recording page.
- `train/train_piper.ipynb`: the training notebook.
- `../docs/voice/runtime/`: the engine that runs the offline voice (ONNX Runtime Web, MIT licence, and eSpeak NG, GPL-3.0). See `LICENSES.md` there.
- `../app/test/`: tests: `voice.test.js` (online voice and fallbacks), `voicepack.test.py` (offline engine in Chromium), `recorder.test.py`.
