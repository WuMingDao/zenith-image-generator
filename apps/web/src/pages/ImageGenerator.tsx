import { useState, useEffect, useRef } from "react";
import { encryptAndStore, decryptFromStore } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageIcon,
  Download,
  Sparkles,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Settings,
  Loader2,
  RotateCcw,
  Info,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

const DEFAULT_PROMPT =
  '一张虚构的英语电影《回忆之味》（The Taste of Memory）的电影海报。场景设置在一个质朴的19世纪风格厨房里。画面中央，一位红棕色头发、留着小胡子的中年男子（演员阿瑟·彭哈利根饰）站在一张木桌后，他身穿白色衬衫、黑色马甲和米色围裙，正看着一位女士，手中拿着一大块生红肉，下方是一个木制切菜板。在他的右边，一位梳着高髻的黑发女子（演员埃莉诺·万斯饰）倚靠在桌子上，温柔地对他微笑。她穿着浅色衬衫和一条上白下蓝的长裙。桌上除了放有切碎的葱和卷心菜丝的切菜板外，还有一个白色陶瓷盘、新鲜香草，左侧一个木箱上放着一串深色葡萄。背景是一面粗糙的灰白色抹灰墙，墙上挂着一幅风景画。最右边的一个台面上放着一盏复古油灯。海报上有大量的文字信息。左上角是白色的无衬线字体"ARTISAN FILMS PRESENTS"，其下方是"ELEANOR VANCE"和"ACADEMY AWARD® WINNER"。右上角写着"ARTHUR PENHALIGON"和"GOLDEN GLOBE® AWARD WINNER"。顶部中央是圣丹斯电影节的桂冠标志，下方写着"SUNDANCE FILM FESTIVAL GRAND JURY PRIZE 2024"。主标题"THE TASTE OF MEMORY"以白色的大号衬线字体醒目地显示在下半部分。标题下方注明了"A FILM BY Tongyi Interaction Lab"。底部区域用白色小字列出了完整的演职员名单，包括"SCREENPLAY BY ANNA REID"、"CULINARY DIRECTION BY JAMES CARTER"以及Artisan Films、Riverstone Pictures和Heritage Media等众多出品公司标志。整体风格是写实主义，采用温暖柔和的灯光方案，营造出一种亲密的氛围。色调以棕色、米色和柔和的绿色等大地色系为主。两位演员的身体都在腰部被截断';
const DEFAULT_NEGATIVE_PROMPT =
  "低质量, 丑陋, 畸形, 模糊, 多余的肢体, 错误的文本";

const ASPECT_RATIOS = [
  {
    label: "1:1",
    icon: Square,
    presets: [
      { w: 1024, h: 1024 },
      { w: 2048, h: 2048 },
    ],
  },
  {
    label: "4:3",
    icon: RectangleHorizontal,
    presets: [
      { w: 1152, h: 896 },
      { w: 2048, h: 1536 },
    ],
  },
  {
    label: "3:4",
    icon: RectangleVertical,
    presets: [
      { w: 768, h: 1024 },
      { w: 1536, h: 2048 },
    ],
  },
  {
    label: "16:9",
    icon: RectangleHorizontal,
    presets: [
      { w: 1024, h: 576 },
      { w: 2048, h: 1152 },
    ],
  },
  {
    label: "9:16",
    icon: RectangleVertical,
    presets: [
      { w: 576, h: 1024 },
      { w: 1152, h: 2048 },
    ],
  },
];

const STORAGE_KEY = "zenith-settings";

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

type ApiProvider = "gitee" | "hf-zimage" | "hf-qwen";

export default function ImageGenerator() {
  const [apiKey, setApiKey] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [apiProvider, setApiProvider] = useState<ApiProvider>(
    () => loadSettings().apiProvider ?? "gitee"
  );
  const [prompt, setPrompt] = useState(
    () => loadSettings().prompt ?? DEFAULT_PROMPT
  );
  const [negativePrompt, setNegativePrompt] = useState(
    () => loadSettings().negativePrompt ?? DEFAULT_NEGATIVE_PROMPT
  );
  const [model] = useState("z-image-turbo");
  const [width, setWidth] = useState(() => loadSettings().width ?? 1024);
  const [height, setHeight] = useState(() => loadSettings().height ?? 1024);
  const [steps, setSteps] = useState(() => loadSettings().steps ?? 9);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(() =>
    localStorage.getItem("lastImageUrl")
  );
  const [status, setStatus] = useState("Ready.");
  const [elapsed, setElapsed] = useState(0);
  const [selectedRatio, setSelectedRatio] = useState(
    () => loadSettings().selectedRatio ?? "1:1"
  );
  const [uhd, setUhd] = useState(() => loadSettings().uhd ?? false);
  const [upscale8k] = useState(() => loadSettings().upscale8k ?? false);
  const [showInfo, setShowInfo] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isUpscaled, setIsUpscaled] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      decryptFromStore().then(setApiKey);
      // Decrypt HF Token
      const stored = localStorage.getItem("hfToken");
      if (stored) {
        try {
          const { iv, data } = JSON.parse(stored);
          crypto.subtle
            .importKey(
              "raw",
              new TextEncoder().encode(navigator.userAgent),
              "PBKDF2",
              false,
              ["deriveKey"]
            )
            .then((key) =>
              crypto.subtle.deriveKey(
                {
                  name: "PBKDF2",
                  salt: new TextEncoder().encode("hf-salt"),
                  iterations: 100000,
                  hash: "SHA-256",
                },
                key,
                { name: "AES-GCM", length: 256 },
                false,
                ["decrypt"]
              )
            )
            .then((derivedKey) =>
              crypto.subtle.decrypt(
                { name: "AES-GCM", iv: new Uint8Array(iv) },
                derivedKey,
                new Uint8Array(data)
              )
            )
            .then((decrypted) =>
              setHfToken(new TextDecoder().decode(decrypted))
            )
            .catch(() => localStorage.removeItem("hfToken"));
        } catch {
          localStorage.removeItem("hfToken");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (initialized.current) {
      saveSettings({
        prompt,
        negativePrompt,
        width,
        height,
        steps,
        selectedRatio,
        uhd,
        upscale8k,
        apiProvider,
      });
    }
  }, [
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    selectedRatio,
    uhd,
    upscale8k,
    apiProvider,
  ]);

  useEffect(() => {
    if (imageUrl) {
      localStorage.setItem("lastImageUrl", imageUrl);
    } else {
      localStorage.removeItem("lastImageUrl");
    }
  }, [imageUrl]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    encryptAndStore(key);
    if (key) toast.success("API Key saved");
  };

  const saveHfToken = async (token: string) => {
    setHfToken(token);
    if (token) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(navigator.userAgent),
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode("hf-salt"),
          iterations: 100000,
          hash: "SHA-256",
        },
        key,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        derivedKey,
        new TextEncoder().encode(token)
      );
      localStorage.setItem(
        "hfToken",
        JSON.stringify({
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(encrypted)),
        })
      );
      toast.success("HF Token saved");
    } else {
      localStorage.removeItem("hfToken");
    }
  };

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(timer);
  }, [loading]);

  const handleRatioSelect = (ratio: (typeof ASPECT_RATIOS)[0]) => {
    setSelectedRatio(ratio.label);
    const preset = uhd ? ratio.presets[1] : ratio.presets[0];
    setWidth(preset.w);
    setHeight(preset.h);
  };

  const handleUhdToggle = (enabled: boolean) => {
    setUhd(enabled);
    const ratio = ASPECT_RATIOS.find((r) => r.label === selectedRatio);
    if (ratio) {
      const preset = enabled ? ratio.presets[1] : ratio.presets[0];
      setWidth(preset.w);
      setHeight(preset.h);
    }
  };

  const addStatus = (msg: string) => {
    setStatus((prev) => prev + "\n" + msg);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `zenith-${Date.now()}.jpg`;
    a.click();
  };

  const handleUpscale = async () => {
    if (!imageUrl || isUpscaling || isUpscaled) return;
    setIsUpscaling(true);
    addStatus("Upscaling to 4x...");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/upscale`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(hfToken && { "X-HF-Token": hfToken }),
          },
          body: JSON.stringify({ url: imageUrl, scale: 4 }),
        }
      );
      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
        setIsUpscaled(true);
        addStatus("4x upscale complete!");
        toast.success("Image upscaled to 4x!");
      } else {
        addStatus(`Upscale failed: ${data.error || "Unknown error"}`);
        toast.error("Upscale failed");
      }
    } catch (err) {
      addStatus(
        `Upscale failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      toast.error("Upscale failed");
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleDelete = () => {
    setImageUrl(null);
    setIsUpscaled(false);
    setIsBlurred(false);
    setShowInfo(false);
    toast.success("Image deleted");
  };

  const handleGenerate = async () => {
    if (apiProvider === "gitee" && !apiKey) {
      toast.error("Please configure your API Key first");
      return;
    }

    setLoading(true);
    setImageUrl(null);
    setIsUpscaled(false);
    setIsBlurred(false);
    setShowInfo(false);
    setStatus("Initializing...");

    try {
      let generatedUrl: string | undefined;

      if (apiProvider === "gitee") {
        addStatus("Sending request to Gitee AI...");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
            },
            body: JSON.stringify({
              prompt,
              negative_prompt: negativePrompt,
              model,
              width,
              height,
              num_inference_steps: steps,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate image");

        generatedUrl =
          data.url ||
          (data.b64_json
            ? `data:image/png;base64,${data.b64_json}`
            : undefined);
      } else {
        addStatus(`Sending request to HF Spaces (${apiProvider})...`);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/generate-hf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(hfToken && { "X-HF-Token": hfToken }),
            },
            body: JSON.stringify({
              prompt,
              width,
              height,
              model: apiProvider === "hf-qwen" ? "qwen" : "zimage",
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate image");
        generatedUrl = data.url;
      }

      if (!generatedUrl) throw new Error("No image returned");
      addStatus("Image generated!");

      if (upscale8k && generatedUrl.startsWith("http")) {
        addStatus("Upscaling to 8K...");
        try {
          const upRes = await fetch(
            `${import.meta.env.VITE_API_URL || ""}/api/upscale`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(hfToken && { "X-HF-Token": hfToken }),
              },
              body: JSON.stringify({ url: generatedUrl, scale: 4 }),
            }
          );

          const upData = await upRes.json();
          if (upRes.ok && upData.url) {
            generatedUrl = upData.url;
            addStatus("8K upscale complete!");
          } else {
            addStatus(`8K upscale failed: ${upData.error || "Unknown error"}`);
            toast.error("8K upscale failed, showing original image");
          }
        } catch (upErr) {
          addStatus(
            `8K upscale failed: ${
              upErr instanceof Error ? upErr.message : "Unknown error"
            }`
          );
          toast.error("8K upscale failed, showing original image");
        }
      }

      setImageUrl(generatedUrl ?? null);
      toast.success("Image generated!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      addStatus(`Error: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-bold tracking-wider bg-gradient-to-r from-orange-400 via-orange-300 to-yellow-400 bg-clip-text text-transparent">
              ZENITH
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">
              AI-Powered Image Generation
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-3 space-y-4">
              {/* API Configuration Accordion */}
              <Accordion
                type="single"
                collapsible
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4"
              >
                <AccordionItem value="api" className="border-none">
                  <AccordionTrigger className="text-zinc-300 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>API Configuration</span>
                      {apiKey && (
                        <span className="text-xs text-green-500">
                          ● Configured
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pb-2">
                      <div>
                        <Label className="text-zinc-400 text-xs">
                          API Provider
                        </Label>
                        <Select
                          value={apiProvider}
                          onValueChange={(v) =>
                            setApiProvider(v as ApiProvider)
                          }
                        >
                          <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900/70 backdrop-blur-md border-zinc-700">
                            <SelectItem value="gitee">Gitee AI</SelectItem>
                            <SelectItem value="hf-zimage">
                              HF Z-Image Turbo
                            </SelectItem>
                            <SelectItem value="hf-qwen">
                              HF Qwen Image
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {apiProvider === "gitee" ? (
                        <div>
                          <Label className="text-zinc-400 text-xs">
                            Gitee API Key
                          </Label>
                          <Input
                            type="password"
                            placeholder="Enter your Gitee AI API Key..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            onBlur={(e) => saveApiKey(e.target.value)}
                            className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-zinc-400 text-xs">
                            HF Token (Optional)
                          </Label>
                          <Input
                            type="password"
                            placeholder="For extra quota..."
                            value={hfToken}
                            onChange={(e) => setHfToken(e.target.value)}
                            onBlur={(e) => saveHfToken(e.target.value)}
                            className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                          />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Main Prompt Card */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <Label className="text-zinc-300 text-sm font-medium">
                      Prompt
                    </Label>
                    <Textarea
                      rows={8}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the image you want to create..."
                      className="mt-2 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none overflow-y-auto max-h-48"
                    />
                  </div>

                  {/* Advanced Settings Accordion */}
                  <Accordion type="single" collapsible>
                    <AccordionItem value="advanced" className="border-zinc-800">
                      <AccordionTrigger className="text-zinc-400 text-sm hover:no-underline py-2">
                        Advanced Settings
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div>
                            <Label className="text-zinc-400 text-xs">
                              Negative Prompt
                            </Label>
                            <Textarea
                              rows={2}
                              value={negativePrompt}
                              onChange={(e) =>
                                setNegativePrompt(e.target.value)
                              }
                              className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
                            />
                          </div>
                          <div>
                            <Label className="text-zinc-400 text-xs flex items-center gap-2">
                              <RotateCcw
                                className="w-3 h-3 cursor-pointer hover:text-orange-400"
                                onClick={() => setSteps(9)}
                              />
                              Inference Steps:{" "}
                              <span className="text-orange-400 font-mono">
                                {steps}
                              </span>
                            </Label>
                            <Slider
                              value={[steps]}
                              onValueChange={(v) => setSteps(v[0])}
                              min={1}
                              max={50}
                              step={1}
                              className="mt-2 bg-orange-500"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Aspect Ratio & UHD */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-300 text-sm font-medium">
                        Aspect Ratio
                      </Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="uhd"
                            className="text-zinc-400 text-xs"
                          >
                            UHD / 2K
                          </Label>
                          <Switch
                            id="uhd"
                            checked={uhd}
                            className={`data-[state=unchecked]:[&>span]:bg-zinc-500 data-[state=checked]:[&>span]:bg-yellow-400 uhd ? "bg-orange-500" : "border-xl border-zinc-800"`}
                            onCheckedChange={handleUhdToggle}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {ASPECT_RATIOS.map((ratio) => {
                        const Icon = ratio.icon;
                        const isSelected = selectedRatio === ratio.label;
                        return (
                          <button
                            key={ratio.label}
                            onClick={() => handleRatioSelect(ratio)}
                            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-orange-500/10 border-orange-500 text-orange-400"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">
                              {ratio.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Width/Height Sliders */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-400 text-xs flex items-center gap-2">
                        <RotateCcw
                          className="w-3 h-3 cursor-pointer hover:text-orange-400"
                          onClick={() => {
                            const ratio = ASPECT_RATIOS.find(
                              (r) => r.label === selectedRatio
                            );
                            if (ratio)
                              setWidth(
                                uhd ? ratio.presets[1].w : ratio.presets[0].w
                              );
                          }}
                        />
                        Width:{" "}
                        <span className="text-orange-400 font-mono">
                          {width}px
                        </span>
                      </Label>
                      <Slider
                        value={[width]}
                        onValueChange={(v) => setWidth(v[0])}
                        min={512}
                        max={2048}
                        step={64}
                        className="mt-2 bg-orange-500"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-xs flex items-center gap-2">
                        <RotateCcw
                          className="w-3 h-3 cursor-pointer hover:text-orange-400"
                          onClick={() => {
                            const ratio = ASPECT_RATIOS.find(
                              (r) => r.label === selectedRatio
                            );
                            if (ratio)
                              setHeight(
                                uhd ? ratio.presets[1].h : ratio.presets[0].h
                              );
                          }}
                        />
                        Height:{" "}
                        <span className="text-orange-400 font-mono">
                          {height}px
                        </span>
                      </Label>
                      <Slider
                        value={[height]}
                        onValueChange={(v) => setHeight(v[0])}
                        min={512}
                        max={2048}
                        step={64}
                        className="mt-2 bg-orange-500"
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 text-base disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Output */}
            <div className="lg:col-span-2 space-y-4">
              {/* Image Result Card */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-zinc-500 text-sm font-normal">
                    Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="Generated"
                          className={`w-full transition-all duration-300 ${
                            isBlurred ? "blur-xl" : ""
                          }`}
                        />
                        {/* Floating Toolbar */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
                          <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl transition-opacity duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                            {/* Info */}
                            <button
                              onClick={() => setShowInfo(!showInfo)}
                              title="Details"
                              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                                showInfo
                                  ? "bg-orange-600 text-white"
                                  : "text-white/70 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <Info className="w-5 h-5" />
                            </button>
                            <div className="w-px h-5 bg-white/10" />
                            {/* 4x Upscale */}
                            <button
                              onClick={handleUpscale}
                              disabled={isUpscaling || isUpscaled}
                              title={
                                isUpscaling
                                  ? "Upscaling..."
                                  : isUpscaled
                                  ? "Already upscaled"
                                  : "4x Upscale"
                              }
                              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                                isUpscaled
                                  ? "text-orange-400 bg-orange-500/10"
                                  : "text-white/70 hover:text-white hover:bg-white/10"
                              } disabled:cursor-not-allowed`}
                            >
                              {isUpscaling ? (
                                <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                              ) : (
                                <span className="text-xs font-bold">4x</span>
                              )}
                            </button>
                            <div className="w-px h-5 bg-white/10" />
                            {/* Blur Toggle */}
                            <button
                              onClick={() => setIsBlurred(!isBlurred)}
                              title="Toggle Blur"
                              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                                isBlurred
                                  ? "text-orange-400 bg-white/10"
                                  : "text-white/70 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {isBlurred ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                            <div className="w-px h-5 bg-white/10" />
                            {/* Download */}
                            <button
                              onClick={handleDownload}
                              title="Download"
                              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all text-white/70 hover:text-white hover:bg-white/10"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={handleDelete}
                              title="Delete"
                              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all text-white/70 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        {/* Info Panel */}
                        {showInfo && (
                          <div className="absolute top-3 left-3 right-3 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs text-zinc-300 space-y-1">
                            <div>
                              <span className="text-zinc-500">Size:</span>{" "}
                              {width}×{height}
                            </div>
                            <div>
                              <span className="text-zinc-500">API:</span>{" "}
                              {apiProvider}
                            </div>
                            <div>
                              <span className="text-zinc-500">Upscaled:</span>{" "}
                              {isUpscaled ? "Yes (4x)" : "No"}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="aspect-square flex flex-col items-center justify-center text-zinc-600">
                        {loading ? (
                          <>
                            <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin mb-3" />
                            <span className="text-zinc-400 font-mono text-lg">
                              {elapsed.toFixed(1)}s
                            </span>
                            <span className="text-zinc-600 text-sm mt-1">
                              Creating your image...
                            </span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-12 h-12 text-zinc-700 mb-2" />
                            <span className="text-zinc-600 text-sm">
                              Your image will appear here
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-zinc-500 text-xs font-normal">
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-24 w-full rounded-md border border-zinc-800 bg-black p-3">
                    <pre className="text-xs text-zinc-500 whitespace-pre-wrap font-mono">
                      {status}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
