  <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden antialiased select-none">
    {/* Top Bar - Modern glassmorphism header */}
    <div className="h-16 bg-black/70 backdrop-blur-xl border-b border-black/40 flex items-center px-6 shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-black/60 rounded-lg flex items-center justify-center shadow border border-white/10">
          <svg
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-wide">
          Animation Studio
        </h1>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        <button
          onClick={() => {
            setExportModalState({
              isOpen: true,
              title: 'Export CSS Animation',
              content: handleExportCSS(),
              fileExtension: 'css',
              mimeType: 'text/css',
            });
          }}
          className="px-3 py-1.5 bg-black/60 border border-white/10 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-600/20 hover:text-white transition-colors duration-200 flex items-center gap-1.5 shadow"
          title="Export as CSS animations with keyframes">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>CSS</span>
        </button>
        <button
          onClick={() => {
            setExportModalState({
              isOpen: true,
              title: 'Export SVG Animation',
              content: handleExportSVG(),
              fileExtension: 'svg',
              mimeType: 'image/svg+xml',
            });
          }}
          className="px-3 py-1.5 bg-black/60 border border-white/10 text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-600/20 hover:text-white transition-colors duration-200 flex items-center gap-1.5 shadow"
          title="Export as animated SVG">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>SVG</span>
        </button>
      </div>
    </div>

    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Layer Management & Keyframe Editor */}
        <div className="w-80 min-w-[300px] bg-black/70 backdrop-blur-xl p-4 flex flex-col border-r border-black/40 shadow-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
            <LayerPanel
              layers={appState.layers}
              selectedLayerId={appState.selectedLayerId}
              onSelectLayer={handleLayerSelect}
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
              onMoveLayer={handleMoveLayer}
              onUpdateLayer={handleUpdateLayer}
              onUpdateLayerName={(layerId, name) =>
                setAppState((prev) => ({
                  ...prev,
                  layers: prev.layers.map((layer) =>
                    layer.id === layerId ? { ...layer, name } : layer,
                  ),
                }))
              }
              onUpdateLayerColor={(layerId, color) =>
                setAppState((prev) => ({
                  ...prev,
                  layers: prev.layers.map((layer) =>
                    layer.id === layerId ? { ...layer, color } : layer,
                  ),
                }))
              }
            />
            {appState.selectedKeyframeInfo && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <KeyframeEditor
                  selectedKeyframeInfo={appState.selectedKeyframeInfo}
                  layers={appState.layers}
                  onUpdateKeyframe={handleUpdateKeyframe}
                  onDeleteKeyframe={handleDeleteLayer}
                  onClearSelection={() =>
                    setAppState((prev) => ({
                      ...prev,
                      selectedKeyframeInfo: null,
                    }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Center Panel: Preview Area */}
        <div
          ref={previewAreaRef}
          className="flex-1 flex items-center justify-center relative bg-black/60 backdrop-blur-xl border-x border-black/40 shadow-xl">
          <PreviewCanvas
            layers={appState.layers}
            currentTime={appState.currentTime}
            canvasSize={canvasSize}
            onLayerPositionChange={handleUpdateLayerPosition}
          />
        </div>
      </div>

      {/* Bottom Panel: Timeline */}
      <div
        className="h-80 min-h-[250px] bg-black/70 backdrop-blur-xl border-t border-black/40 shadow-2xl overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20"
        style={{ resize: 'vertical' }}>
        <TimelinePanel
          appState={appState}
          onSetCurrentTime={(time) =>
            setAppState((prev) => ({ ...prev, currentTime: time }))
          }
          onTogglePlay={() =>
            setAppState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
          }
          onAddKeyframe={handleAddKeyframe}
          onDragKeyframe={handleDragKeyframe}
          onSelectKeyframe={(info) =>
            setAppState((prev) => ({ ...prev, selectedKeyframeInfo: info }))
          }
          onChangeDuration={(duration) =>
            setAppState((prev) => ({ ...prev, duration }))
          }
          onChangeZoom={(zoom) =>
            setAppState((prev) => ({ ...prev, timelineZoom: zoom }))
          }
        />
      </div>
    </div>

    <ExportModal
      isOpen={exportModalState.isOpen}
      onClose={() =>
        setExportModalState((prev) => ({ ...prev, isOpen: false }))
      }
      title={exportModalState.title}
      content={exportModalState.content}
      fileExtension={exportModalState.fileExtension}
      mimeType={exportModalState.mimeType}
    />
  </div> 