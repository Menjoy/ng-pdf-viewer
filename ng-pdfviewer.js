/**
 * @preserve AngularJS PDF viewer directive using pdf.js.
 *
 * https://github.com/akrennmair/ng-pdfviewer 
 *
 * MIT license
 */

angular.module('ngPDFViewer', []).
directive('pdfviewer', [ '$parse', function($parse) {
	var canvas = null;
	var instance_id = null;

	return {
		restrict: "E",
		template: '<canvas></canvas>',
		scope: {
			onPageLoad: '&',
			loadProgress: '&',
			src: '@',
			id: '='
		},
		controller: [ '$scope', function($scope) {
			$scope.pageNum = 1;
			$scope.pdfDoc = null;
			$scope.scale = 1.0;

			$scope.documentProgress = function(progressData) {
				if ($scope.loadProgress) {
					$scope.loadProgress({state: "loading", loaded: progressData.loaded, total: progressData.total});
				}
			};

			$scope.loadPDF = function(path) {
				console.log('loadPDF ', path);
				PDFJS.getDocument(path, null, null, $scope.documentProgress).then(function(_pdfDoc) {
					$scope.pdfDoc = _pdfDoc;
					$scope.renderPage($scope.pageNum, function(success) {
						if ($scope.loadProgress) {
							$scope.loadProgress({state: "finished", loaded: 0, total: 0});
						}
					});
				}, function(message, exception) {
					console.log("PDF load error: " + message);
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "error", loaded: 0, total: 0});
					}
				});
			};

			$scope.renderPage = function(num, callback) {
				console.log('renderPage ', num);
				$scope.pdfDoc.getPage(num).then(function(page) {
					var viewport = page.getViewport($scope.scale);
					var ctx = canvas.getContext('2d');

					canvas.height = viewport.height;
					canvas.width = viewport.width;

					page.render({ canvasContext: ctx, viewport: viewport }).then(
						function() { 
							if (callback) {
								callback(true);
							}
							$scope.$apply(function() {
								$scope.onPageLoad({ page: $scope.pageNum, total: $scope.pdfDoc.numPages });
							});
						}, 
						function() {
							if (callback) {
								callback(false);
							}
							console.log('page.render failed');
						}
					);
				});
			};

			$scope.$on('pdfviewer.nextPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum < $scope.pdfDoc.numPages) {
					$scope.pageNum++;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.prevPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum > 1) {
					$scope.pageNum--;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.gotoPage', function(evt, id, page) {
				if (id !== instance_id) {
					return;
				}

				if (page >= 1 && page <= $scope.pdfDoc.numPages) {
					$scope.pageNum = page;
					$scope.renderPage($scope.pageNum);
				}
			});
		} ],
        link: function($scope, $elem, attrs) {
            canvas = $elem.find('canvas')[0];
            instance_id = attrs.id;

            attrs.$observe('src', function(url) {
                if (url !== undefined && url !== null && url !== '') {
                    $scope.pageNum = 1;

                    var oReq = new XMLHttpRequest();
                    oReq.open('GET', url, true);
                    oReq.responseType = 'arraybuffer';

                    oReq.onload = function () {
                        var arrayBuffer = oReq.response;
                        if (arrayBuffer) {
                            var byteArray = new Uint8Array(arrayBuffer);
                            $scope.loadPDF(byteArray);
                        }
                    };

                    oReq.send(null);
                }
            });
		}
	};
}]).
service("PDFViewerService", [ '$rootScope', function($rootScope) {

	var svc = { };
	svc.nextPage = function() {
		$rootScope.$broadcast('pdfviewer.nextPage');
	};

	svc.prevPage = function() {
		$rootScope.$broadcast('pdfviewer.prevPage');
	};

	svc.Instance = function(id) {
		var instance_id = id;

		return {
			prevPage: function() {
				$rootScope.$broadcast('pdfviewer.prevPage', instance_id);
			},
			nextPage: function() {
				$rootScope.$broadcast('pdfviewer.nextPage', instance_id);
			},
			gotoPage: function(page) {
				$rootScope.$broadcast('pdfviewer.gotoPage', instance_id, page);
			}
		};
	};

	return svc;
}]);
