# Paperly

Local reader for one document at a time. Drop in a PDF or paste the text, then get a cited summary, ask questions, or check strengths and weaknesses. Answers stay tied to quotes from that document.

There are no accounts. Papers live on disk on the machine running the app. When you generate or ask, the extracted text is sent to Google Gemini.

## What you can do

- Upload a PDF (up to 50 MB and 1,000 pages) or paste text (at least 80 characters).
- Read an overview: research question, contribution, method, dataset, findings, limitations, numbers, and conclusion.
- Generate a structured summary: Brief (~250 words), Standard (~650), or Comprehensive (~1,400). Set the length (50–2,000 words) and the tone (Academic / Technical, C-Suite / Executive, Simplified / Layperson), add optional focus questions, then rewrite. The summary follows a fixed schema: executive overview, takeaways, critical appraisal, digitized handwriting, section breakdown, and extracted metrics, with `[Page X]` on each claim.
- Ask for strengths, limitations the authors actually wrote, and a separate Paperly analysis that is labeled as judgment rather than a claim from the paper.
- Chat about the paper. The last 12 turns are sent as conversation context. Earlier answers are not treated as evidence.
- Open the PDF beside the answer. The pane starts around 880px wide, drags out to 1,200px, and zooms from 75% to 250%.
- Hover a citation, or select a sentence in an answer, and Paperly highlights that passage in the PDF.
- Read fractions and equations as math. The model is told to emit LaTeX (`$\frac{2}{3}$`), and the page renders it with KaTeX.

The model id that actually answered is shown under the paper title and above the text. A later chat turn can fall back to a different model, and that reply is labeled on its own.

## How answers stay grounded

Every prompt includes the extracted page text, marked by page. Paperly does not use embeddings or a vector index. One paper fits in the prompt.

Citations have to be quotes copied from that text. A quote that cannot be found is dropped. If the quote is real but the page number is wrong, the page is corrected. Strengths and author-stated limitations are kept only when a quote survives. Paperly's own analysis may omit a quote only when it is pointing out something the paper does not say.

Long papers are not sent in full. The prompt keeps the first two pages, the last two pages, and the pages that overlap the question, and the answer says the coverage is partial.

Scanned PDFs with very little extractable text are flagged. In that case, and when a question mentions a figure, table, equation, chart, or diagram, Paperly also uploads the PDF to the Gemini Files API so the model can see the pages. Uploaded files expire after about 48 hours.

Pasted text has no PDF viewer. Citations use page 1 and a section label when one is visible.

## Models

`GEMINI_MODEL` is tried first. The default is `gemini-3.8-flash`. If that model is busy, missing, or out of free quota, Paperly tries the next model and shows whichever one answered:

1. `gemini-3.8-flash`
2. `gemini-3.5-flash-lite`
3. `gemini-3.1-flash-lite`
4. `gemini-3.7-flash`
5. `gemini-3.6-flash`
6. `gemini-3.5-flash`

A daily or per-minute quota error skips that model immediately. High demand retries the preferred model once, then moves on. `gemini-2.5-flash` is not in this list: for new API keys Google returns that it is no longer available.

Free-tier Flash models are often capped at about 20 requests a day. The Flash-Lite models are the ones with room to keep answering after that.

## Run it

Node 20 or newer.

```bash
npm install
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.8-flash
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Restart the dev server after changing `.env`.

```bash
npm run lint
npm run build
npm start
```

## Where papers are stored

Each paper is a folder under `data/papers/<id>/`:

| File | Contents |
| --- | --- |
| `original.pdf` | The uploaded file, when the source is a PDF |
| `paper.json` | Title, authors, year, abstract, page count, text quality |
| `pages.json` | Extracted text, one entry per page |
| `messages.json` | Chat history |
| `artifacts/*.json` | Cached overview, summaries, and analysis |

Delete a paper by deleting its folder. `data/` is gitignored.

## Privacy

The PDF and the extracted text stay on this computer until you generate or ask. Those requests send the paper text to Google. A native PDF is attached only for sparse or scanned text, or when the question is about a figure, table, equation, chart, or diagram.

Do not commit `.env`. `.env.example` ships with an empty key.

## What this is not

Paperly reads one paper. It does not search a library, compare papers, or keep accounts. There is no database.
