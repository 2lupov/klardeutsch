import { describe, it, expect, beforeEach } from "vitest";
import { toHtml, plain, applyRemoteHtml, LOCAL_TYPING_GRACE_MS } from "@/lib/rich-text";

describe("toHtml: очистка HTML з живих аркушів", () => {
  it("лишає розмітку учня: маркер, жирний, підкреслення, закреслення", () => {
    const src = '<span style="background-color: rgb(253, 224, 71);">gelb</span> <b>fett</b> <u>unter</u> <strike>weg</strike>';
    const out = toHtml(src);
    expect(out).toContain("background-color: rgb(253, 224, 71)");
    expect(out).toContain("<b>fett</b>");
    expect(out).toContain("<u>unter</u>");
    expect(out).toContain("<strike>weg</strike>");
  });

  it.each([
    ['<img src=x onerror="alert(1)">', "onerror"],
    ["<svg/onload=alert(1)>", "onload"],
    ['<a href="javascript:alert(1)">klick</a>', "javascript"],
    ['<a href="java\tscript:alert(1)">klick</a>', "script:"],
    ['<a href="data:text/html,<script>alert(1)</script>">x</a>', "data:"],
    ["<script>alert(1)</script>ok", "<script"],
    ["<iframe src=//evil></iframe>ok", "iframe"],
    ['<meta http-equiv="refresh" content="0;url=//evil">ok', "meta"],
    ['<link rel=stylesheet href=//evil>ok', "<link"],
    ['<base href="//evil">ok', "<base"],
    ['<div style="background:url(//evil/x.png)">t</div>', "url("],
    ['<div style="position:fixed;inset:0">t</div>', "position"],
    ['<p onclick="x()">t</p>', "onclick"],
  ])("прибирає небезпечне: %s", (src, forbidden) => {
    const out = toHtml(src).toLowerCase();
    expect(out).not.toContain(forbidden.toLowerCase());
  });

  it("зберігає текст із невідомих тегів", () => {
    expect(plain(toHtml("<custom>Hallo</custom> Welt"))).toBe("Hallo Welt");
  });

  it("звичайний текст екранується й зберігає переноси", () => {
    expect(toHtml("a < b\nzweite")).toBe("a &lt; b<br>zweite");
  });

  it("plain() не виконує та не вантажить розмітку", () => {
    let fired = false;
    (window as any).__xss = () => { fired = true; };
    const t = plain('<img src=x onerror="window.__xss()">Text');
    expect(t).toBe("Text");
    expect(fired).toBe(false);
  });
});

describe("applyRemoteHtml: свій ввід важливіший за чужий", () => {
  let el: HTMLDivElement;
  beforeEach(() => {
    document.body.innerHTML = "";
    el = document.createElement("div");
    el.contentEditable = "true";
    el.tabIndex = 0;
    document.body.appendChild(el);
  });

  it("не перезаписує поле, поки людина друкує", () => {
    el.innerHTML = "Ich schreibe gerade";
    el.focus();
    const applied = applyRemoteHtml(el, "чужий текст", Date.now());
    expect(applied).toBe(false);
    expect(el.innerHTML).toBe("Ich schreibe gerade");
  });

  it("застосовує чужі зміни, коли людина зупинилась", () => {
    el.innerHTML = "alt";
    el.focus();
    const applied = applyRemoteHtml(el, "neu", Date.now() - LOCAL_TYPING_GRACE_MS - 50);
    expect(applied).toBe(true);
    expect(el.innerHTML).toBe("neu");
  });

  it("застосовує зміни, якщо поле не у фокусі", () => {
    el.innerHTML = "alt";
    const applied = applyRemoteHtml(el, "neu", Date.now());
    expect(applied).toBe(true);
    expect(el.innerHTML).toBe("neu");
  });
});
