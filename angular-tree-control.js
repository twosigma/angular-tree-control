(function ( angular ) {
    'use strict';

    angular.module( 'treeControl', [] )
        .directive( 'treecontrol', ['$compile', function( $compile ) {
            /**
             * @param cssClass - the css class
             * @param addClassProperty - should we wrap the class name with class=""
             */
            function classIfDefined(cssClass, addClassProperty) {
                if (cssClass) {
                    if (addClassProperty)
                        return 'class="' + cssClass + '"';
                    else
                        return cssClass;
                }
                else
                    return "";
            }

            function ensureDefault(obj, prop, value) {
                if (!obj.hasOwnProperty(prop))
                    obj[prop] = value;
            }

            function openSiblings(el) {
                var parent = angular.element(el).parent(),
                    opened = [];
                function isSiblingOpen(node, direction) {
                    if(node[0]) {
                        var currentNode = angular.element(node[0][direction + 'ElementSibling']);
                        if(!currentNode.length) return;
                        if(currentNode.hasClass('tree-expanded')){
                            opened.push(currentNode.scope().$id)
                         }
                        isSiblingOpen(currentNode, direction);
                    }
                }
                isSiblingOpen(parent, 'previous');
                isSiblingOpen(parent, 'next');
                return opened;
            }

            return {
                restrict: 'EA',
                require: "treecontrol",
                transclude: true,
                scope: {
                    treeModel: "=",
                    selectedNode: "=?",
                    expandedNodes: "=?",
                    onSelection: "&",
                    onNodeToggle: "&",
                    bindFunctionsTo: "=?",
                    options: "=?",
                    orderBy: "@",
                    reverseOrder: "@"
                },
                controller: ['$scope', function( $scope ) {

                    $scope.visibleNodes = [];
                    $scope.nodeIdMap = {};

                    if($scope.bindFunctionsTo) {
                        $scope.bindFunctionsTo = {
                            selectFirst: function() {
                                if($scope.selectedIndex() === 0) return;
                                $scope.selectNodeLabel($scope.visibleNodes[0]);
                            },
                            selectPrevious: function() {
                                if($scope.selectedIndex() === 0) return;
                                $scope.selectNodeLabel($scope.visibleNodes[$scope.selectedIndex()-1]);
                            },
                            selectNext: function() {
                                if($scope.selectedIndex() === $scope.visibleNodes.length-1) return;
                                $scope.selectNodeLabel($scope.visibleNodes[$scope.selectedIndex()+1]);
                            },
                            selectLast: function() {
                                if($scope.selectedIndex() === $scope.visibleNodes.length-1) return;
                                $scope.selectNodeLabel($scope.visibleNodes[$scope.visibleNodes.length-1]);
                            },
                            expandNode: function() {
                                var nodeObj = {$id: $scope.nodeIdMap[$scope.selectedNode.id], node: $scope.selectedNode};
                                if(!$scope.selectedNode || $scope.nodeExpanded.call(nodeObj)) return;
                                $scope.selectNodeHead.call(nodeObj);
                            },
                            collapseNode: function() {
                                var nodeObj = {$id: $scope.nodeIdMap[$scope.selectedNode.id], node: $scope.selectedNode};
                                if(!$scope.selectedNode || !$scope.nodeExpanded.call(nodeObj)) return;
                                $scope.selectNodeHead.call(nodeObj);
                            }
                        };
                    }


                    function defaultIsLeaf(node) {
                        return !node[$scope.options.nodeChildren] || node[$scope.options.nodeChildren].length === 0;
                    }

                    function defaultEquality(a, b) {
                        if (a === undefined || b === undefined)
                            return false;
                        a = angular.copy(a);
                        a[$scope.options.nodeChildren] = [];
                        b = angular.copy(b);
                        b[$scope.options.nodeChildren] = [];
                        return angular.equals(a, b);
                    }

                    $scope.options = $scope.options || {};
                    ensureDefault($scope.options, "nodeChildren", "children");
                    ensureDefault($scope.options, "onLabelClick", "select");
                    ensureDefault($scope.options, "injectClasses", {});
                    ensureDefault($scope.options.injectClasses, "ul", "");
                    ensureDefault($scope.options.injectClasses, "li", "");
                    ensureDefault($scope.options.injectClasses, "liSelected", "");
                    ensureDefault($scope.options.injectClasses, "iExpanded", "");
                    ensureDefault($scope.options.injectClasses, "iCollapsed", "");
                    ensureDefault($scope.options.injectClasses, "iLeaf", "");
                    ensureDefault($scope.options.injectClasses, "label", "");
                    ensureDefault($scope.options.injectClasses, "labelSelected", "");
                    ensureDefault($scope.options, "equality", defaultEquality);
                    ensureDefault($scope.options, "isLeaf", defaultIsLeaf);
                    ensureDefault($scope.options, "allowMultiple", true);
                    ensureDefault($scope.options, "allowReSelection", true);
                    ensureDefault($scope.options, "performTreeSelectionOnLoad", true);

                    $scope.expandedNodes = $scope.expandedNodes || [];
                    $scope.expandedNodesMap = {};
                    for (var i=0; i < $scope.expandedNodes.length; i++) {
                        $scope.expandedNodesMap[""+i] = $scope.expandedNodes[i];
                    }
                    $scope.parentScopeOfTree = $scope.$parent;

                    $scope.collapseNode = function(node) {
                        var index;
                        for (var i=0; (i < $scope.expandedNodes.length) && !index; i++) {
                            if ($scope.options.equality($scope.expandedNodes[i], node)) {
                                index = i;
                            }
                        }
                        if (index != undefined)
                            $scope.expandedNodes.splice(index, 1);
                        if($scope.onNodeToggle)
                            $scope.onNodeToggle({node: node, expanded: false});
                    };

                    $scope.expandNode = function(node) {
                        $scope.expandedNodes.push(node);
                        if($scope.onNodeToggle)
                            $scope.onNodeToggle({node: node, expanded: true});
                    };

                    $scope.headClass = function(node) {
                        var liSelectionClass = classIfDefined($scope.options.injectClasses.liSelected, false);
                        var injectSelectionClass = "";
                        if (liSelectionClass && ($scope.options.equality(this.node, $scope.selectedNode)))
                            injectSelectionClass = " " + liSelectionClass;
                        if ($scope.options.isLeaf(node))
                            return "tree-leaf" + injectSelectionClass;
                        if ($scope.expandedNodesMap[this.$id])
                            return "tree-expanded" + injectSelectionClass;
                        else
                            return "tree-collapsed" + injectSelectionClass;
                    };

                    $scope.iBranchClass = function() {
                        if ($scope.expandedNodesMap[this.$id])
                            return classIfDefined($scope.options.injectClasses.iExpanded);
                        else
                            return classIfDefined($scope.options.injectClasses.iCollapsed);
                    };

                    $scope.nodeExpanded = function() {
                        return !!$scope.expandedNodesMap[this.$id];
                    };

                    $scope.selectNodeHead = function(event) {
                        var expanding = $scope.expandedNodesMap[this.$id] === undefined;
                        $scope.expandedNodesMap[this.$id] = (expanding ? this.node : undefined);
                        if (expanding) {
                            if(!$scope.options.allowMultiple){
                                var openedSiblings  = openSiblings(event.currentTarget);
                                openedSiblings.forEach(function (sibling) {
                                    $scope.collapseNode($scope.expandedNodesMap[sibling]);
                                })
                            }
                            $scope.expandNode(this.node);
                        }
                        else {
                            $scope.collapseNode(this.node)
                        }
                    };

                    $scope.selectNodeLabel = function( event, selectedNode ){
                        if ( $scope.options.onLabelClick.match("expand|both") &&
                            !$scope.expandedNodesMap[this.$id] &&
                            selectedNode[$scope.options.nodeChildren] &&
                            selectedNode[$scope.options.nodeChildren].length > 0) {
                            this.selectNodeHead(event);
                        }
                        if ($scope.options.onLabelClick.match("select|both") ||
                            (selectedNode[$scope.options.nodeChildren] &&
                            selectedNode[$scope.options.nodeChildren].length <= 0)){
                            if ($scope.selectedNode != selectedNode || $scope.options.allowReSelection) {
                                $scope.selectedNode = selectedNode;
                                if ($scope.onSelection)
                                    $scope.onSelection({node: selectedNode});
                            }
                        }
                    };

                    $scope.selectedIndex = function() {
                        return $scope.visibleNodes.indexOf($scope.selectedNode);
                    };

                    $scope.selectedClass = function() {
                        var labelSelectionClass = classIfDefined($scope.options.injectClasses.labelSelected, false);
                        var injectSelectionClass = "";
                        if (labelSelectionClass && (this.node == $scope.selectedNode))
                            injectSelectionClass = " " + labelSelectionClass;

                        return (this.node == $scope.selectedNode)?"tree-selected" + injectSelectionClass:"";
                    };

                    //tree template
                    var template =
                        '<ul '+classIfDefined($scope.options.injectClasses.ul, true)+'>' +
                            '<li ng-repeat="node in node.' + $scope.options.nodeChildren + ' | orderBy:orderBy:reverseOrder" ng-class="headClass(node)" '+classIfDefined($scope.options.injectClasses.li, true)+'>' +
                            '<i class="tree-branch-head" ng-class="iBranchClass()" ng-click="selectNodeHead($event, node)"></i>' +
                            '<i class="tree-leaf-head '+classIfDefined($scope.options.injectClasses.iLeaf, false)+'"></i>' +
                            '<div class="tree-label '+classIfDefined($scope.options.injectClasses.label, false)+'" ng-class="selectedClass()" ng-click="selectNodeLabel($event, node)" tree-transclude></div>' +
                            '<treeitem ng-if="nodeExpanded()"></treeitem>' +
                            '</li>' +
                            '</ul>';

                    return {
                        template: $compile(template)
                    }
                }],
                compile: function(element, attrs, childTranscludeFn) {
                    return function ( scope, element, attrs, treemodelCntr ) {

                        scope.$watch("treeModel", function updateNodeOnRootScope(newValue) {
                            if (angular.isArray(newValue)) {
                                if (angular.isDefined(scope.node) && angular.equals(scope.node[scope.options.nodeChildren], newValue))
                                    return;
                                scope.node = {};
                                scope.synteticRoot = scope.node;
                                scope.node[scope.options.nodeChildren] = newValue;
                            }
                            else {
                                if (angular.equals(scope.node, newValue))
                                    return;
                                scope.node = newValue;
                            }
                        });

                        scope.$watchCollection('expandedNodes', function(newValue) {
                            var notFoundIds = 0;
                            var newExpandedNodesMap = {};
                            var $liElements = element.find('li');
                            var existingScopes = [];
                            // find all nodes visible on the tree and the scope $id of the scopes including them
                            angular.forEach($liElements, function(liElement) {
                                var $liElement = angular.element(liElement);
                                var liScope = $liElement.scope();
                                existingScopes.push(liScope);
                            });
                            // iterate over the newValue, the new expanded nodes, and for each find it in the existingNodesAndScopes
                            // if found, add the mapping $id -> node into newExpandedNodesMap
                            // if not found, add the mapping num -> node into newExpandedNodesMap
                            angular.forEach(newValue, function(newExNode) {
                                var found = false;
                                for (var i=0; (i < existingScopes.length) && !found; i++) {
                                    var existingScope = existingScopes[i];
                                    if (scope.options.equality(newExNode, existingScope.node)) {
                                        newExpandedNodesMap[existingScope.$id] = existingScope.node;
                                        found = true;
                                    }
                                }
                                if (!found)
                                    newExpandedNodesMap[notFoundIds++] = newExNode;
                            });
                            scope.expandedNodesMap = newExpandedNodesMap;
                        });

//                        scope.$watch('expandedNodesMap', function(newValue) {
//
//                        });

                        //Rendering template for a root node
                        treemodelCntr.template( scope, function(clone) {
                            element.html('').append( clone );
                        });
                        // save the transclude function from compile (which is not bound to a scope as apposed to the one from link)
                        // we can fix this to work with the link transclude function with angular 1.2.6. as for angular 1.2.0 we need
                        // to keep using the compile function
                        scope.$treeTransclude = childTranscludeFn;
                    }
                }
            };
        }])
        .directive("treeitem", function() {
            return {
                restrict: 'E',
                require: "^treecontrol",
                link: function( scope, element, attrs, treemodelCntr) {
                    // Rendering template for the current node
                    treemodelCntr.template(scope, function(clone) {
                        element.html('').append(clone);
                    });
                }
            }
        })
        .directive("treeTransclude", function() {
            return {
                link: function(scope, element, attrs, controller) {
                    scope.$parent.nodeIdMap[scope.node.id] = scope.$id;

                    if (!scope.options.isLeaf(scope.node)) {
                        angular.forEach(scope.expandedNodesMap, function (node, id) {
                            if (scope.options.equality(node, scope.node)) {
                                scope.expandedNodesMap[scope.$id] = scope.node;
                                scope.expandedNodesMap[id] = undefined;
                            }
                        });
                    }
                    if (scope.options.performTreeSelectionOnLoad &&
                        scope.options.equality(scope.node, scope.selectedNode)) {
                        scope.selectNodeLabel("", scope.node);
                    }

                    // create a scope for the transclusion, whos parent is the parent of the tree control
                    scope.transcludeScope = scope.parentScopeOfTree.$new();
                    scope.transcludeScope.node = scope.node;
                    scope.transcludeScope.$parentNode = (scope.$parent.node === scope.synteticRoot)?null:scope.$parent.node;
                    scope.transcludeScope.$index = scope.$index;
                    scope.transcludeScope.$first = scope.$first;
                    scope.transcludeScope.$middle = scope.$middle;
                    scope.transcludeScope.$last = scope.$last;
                    scope.transcludeScope.$odd = scope.$odd;
                    scope.transcludeScope.$even = scope.$even;
                    scope.$on('$destroy', function() {
                        scope.$parent.visibleNodes.splice(scope.$parent.visibleNodes.indexOf(scope.node), 1);
                        scope.$parent.nodeIdMap[scope.node.id] = null;
                        scope.transcludeScope.$destroy();
                    });

                    scope.$treeTransclude(scope.transcludeScope, function(clone) {
                        element.empty();
                        element.append(clone);
                    });

                    var parentIndex = scope.$parent.visibleNodes.indexOf(scope.$parent.node);
                    if(parentIndex !== -1) {
                        var myIndex = 1 + scope.transcludeScope.$parentNode.children.indexOf(scope.node);
                        scope.$parent.visibleNodes.splice(parentIndex+myIndex, 0, scope.node);
                    } else {
                        scope.$parent.visibleNodes.push(scope.node);
                    }
                }
            }
        });
})( angular );
