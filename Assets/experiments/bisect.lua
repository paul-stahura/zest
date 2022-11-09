print('Hello, World!')

function onDraw()
    print('middleIndex:' .. spiral.middleIndex)
    print('index:' .. index)
    print('links:' .. spiral.links[1].x .. ',' .. spiral.links[1].y)

    from = {x=0, y=0}
    to = {x=1, y=1}
    draw.line(from, to)
end
